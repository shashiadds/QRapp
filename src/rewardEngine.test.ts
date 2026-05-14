import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateReward, submitReward } from "./rewardEngine";
import type { Shop, Transaction, VisitorContext } from "./types";

const baseShop: Shop = {
  id: "TestShop",
  name: "Test Shop",
  category: "Retail",
  status: "active",
  maxReward: 100,
  costPerScan: 10,
  rewardBands: [
    { reward: 10, probability: 70 },
    { reward: 20, probability: 20 },
    { reward: 50, probability: 10, minBill: 100 },
  ],
};

const visitorContext: VisitorContext = {
  ipAddress: "127.0.0.1",
  location: "Pune, Maharashtra",
  latitude: 18.5204,
  longitude: 73.8567,
};

function shop(overrides: Partial<Shop> = {}): Shop {
  return {
    ...baseShop,
    ...overrides,
    rewardBands: overrides.rewardBands ?? baseShop.rewardBands,
  };
}

function approvedTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "TRX-100001",
    customerName: "Existing Customer",
    address: "Existing Address",
    ipAddress: visitorContext.ipAddress,
    location: visitorContext.location,
    latitude: visitorContext.latitude,
    longitude: visitorContext.longitude,
    mobile: "9876543210",
    shopId: baseShop.id,
    billAmount: 100,
    reward: 10,
    status: "approved",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("calculateReward", () => {
  it("never returns less than 10 cashback for fixed reward bands", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reward = calculateReward(
      shop({
        rewardBands: [{ reward: 5, probability: 100 }],
      }),
      20
    );

    expect(reward).toBe(10);
  });

  it("uses eligible fixed bands according to probability", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);

    const reward = calculateReward(baseShop, 25000);

    expect(reward).toBe(20);
  });

  it("excludes fixed bands until the bill reaches minBill", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const testShop = shop({
      rewardBands: [
        { reward: 10, probability: 70 },
        { reward: 20, probability: 20 },
        { reward: 50, probability: 10, minBill: 12000 },
      ],
    });
    const belowMinBillReward = calculateReward(testShop, 11000);
    const atMinBillReward = calculateReward(testShop, 12000);

    expect(belowMinBillReward).toBe(20);
    expect(atMinBillReward).toBe(50);
  });

  it("respects each shop maxReward for fixed bands", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reward = calculateReward(
      shop({
        maxReward: 30,
        rewardBands: [{ reward: 100, probability: 100 }],
      }),
      500
    );

    expect(reward).toBe(30);
  });

  it("caps fixed bands at the global 1000 cashback limit", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reward = calculateReward(
      shop({
        maxReward: 5000,
        rewardBands: [{ reward: 2500, probability: 100 }],
      }),
      25000
    );

    expect(reward).toBe(1000);
  });

  it("falls back to 10 cashback when no reward bands are eligible", () => {
    const reward = calculateReward(
      shop({
        rewardBands: [{ reward: 50, probability: 100, minBill: 500 }],
      }),
      100
    );

    expect(reward).toBe(10);
  });

  it("calculates default percent rewards, rounds down to nearest 10, and clamps to minimum", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reward = calculateReward(
      shop({
        rewardBands: [],
      }),
      50
    );

    expect(reward).toBe(10);
  });

  it("respects shop maxReward for percent rewards", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const reward = calculateReward(
      shop({
        maxReward: 60,
        rewardBands: [],
      }),
      1000
    );

    expect(reward).toBe(60);
  });

  it("caps percent rewards at the global 1000 cashback limit", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const reward = calculateReward(
      shop({
        id: "RahulAgency",
        name: "Rahul Agency",
        maxReward: 5000,
        rewardBands: [],
      }),
      10000
    );

    expect(reward).toBe(1000);
  });

  it("uses Rahul Agency custom percent slabs", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const reward = calculateReward(
      shop({
        id: "RahulAgency",
        name: "Rahul Agency",
        maxReward: 5000,
        rewardBands: [],
      }),
      2000
    );

    expect(reward).toBe(400);
  });
});

describe("submitReward", () => {
  it("creates an approved transaction with trimmed customer details and calculated reward", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = submitReward(
      baseShop,
      "  Neha Patil  ",
      "  Pune  ",
      "9876543210",
      100,
      [],
      visitorContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.transaction.customerName).toBe("Neha Patil");
    expect(result.transaction.address).toBe("Pune");
    expect(result.transaction.mobile).toBe("9876543210");
    expect(result.transaction.reward).toBe(10);
    expect(result.transaction.status).toBe("approved");
    expect(result.transaction.ipAddress).toBe(visitorContext.ipAddress);
  });

  it("rejects paused shops", () => {
    const result = submitReward(
      shop({ status: "paused" }),
      "Neha Patil",
      "Pune",
      "9876543210",
      100,
      [],
      visitorContext
    );

    expect(result).toEqual({ ok: false, reason: "This shop is not accepting new scans." });
  });

  it("validates customer name, address, mobile, and minimum bill amount", () => {
    expect(
      submitReward(baseShop, " ", "Pune", "9876543210", 100, [], visitorContext)
    ).toEqual({ ok: false, reason: "Enter customer name." });

    expect(
      submitReward(baseShop, "Neha Patil", " ", "9876543210", 100, [], visitorContext)
    ).toEqual({ ok: false, reason: "Enter customer address." });

    expect(
      submitReward(baseShop, "Neha Patil", "Pune", "1234567890", 100, [], visitorContext)
    ).toEqual({ ok: false, reason: "Enter a valid 10 digit mobile number." });

    expect(
      submitReward(baseShop, "Neha Patil", "Pune", "9876543210", 9, [], visitorContext)
    ).toEqual({ ok: false, reason: "Bill amount must be at least ₹10." });
  });

  it("allows the same mobile to receive multiple rewards at the same shop today", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = submitReward(
      baseShop,
      "Neha Patil",
      "Pune",
      "9876543210",
      100,
      [approvedTransaction()],
      visitorContext
    );

    expect(result.ok).toBe(true);
  });

  it("does not need to inspect older or unrelated transactions before approving", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 1);

    const result = submitReward(
      baseShop,
      "Neha Patil",
      "Pune",
      "9876543210",
      100,
      [
        approvedTransaction({ shopId: "AnotherShop" }),
        approvedTransaction({ status: "blocked" }),
        approvedTransaction({ timestamp: olderDate.toISOString() }),
      ],
      visitorContext
    );

    expect(result.ok).toBe(true);
  });
});
