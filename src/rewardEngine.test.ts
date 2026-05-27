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
  it("never returns less than 10 points for fixed reward bands", () => {
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

  it("caps fixed bands at the global 1000 points limit", () => {
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

  it("caps fixed band points at the purchase total", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const reward = calculateReward(
      shop({
        rewardBands: [{ reward: 50, probability: 100 }],
      }),
      11
    );

    expect(reward).toBe(11);
  });

  it("falls back to 10 points when no reward bands are eligible", () => {
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

  it("defaults falsy or zero maxReward to global limit (1000) instead of capping at 10", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const reward = calculateReward(
      shop({
        maxReward: 0,
        rewardBands: [],
      }),
      1000
    );

    expect(reward).toBe(100);
  });

  it("applies safety fallback maxReward of 600 for Kale Medical when set to 100 or 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const rewardWith100 = calculateReward(
      shop({
        id: "kalemedical",
        name: "Kale Medical",
        maxReward: 100,
        rewardBands: [],
      }),
      10000
    );
    expect(rewardWith100).toBe(600);

    const rewardWith0 = calculateReward(
      shop({
        id: "kalemedical",
        name: "Kale Medical",
        maxReward: 0,
        rewardBands: [],
      }),
      10000
    );
    expect(rewardWith0).toBe(600);
  });

  it("caps percent rewards at the global 1000 points limit", () => {
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

  describe("Sandesh Agro Machinery custom slabs", () => {
    const sandeshShop = shop({
      id: "sandeshagromachinery",
      name: "Sandesh Agro Machinery",
      maxReward: 5000,
      rewardBands: [],
    });

    it("works when shop name is Sandesh Agro and ID is sandeshagro", () => {
      const shortShop = shop({
        id: "sandeshagro",
        name: "Sandesh Agro",
        maxReward: 5000,
        rewardBands: [],
      });
      // 5% of 5000 = 250
      expect(calculateReward(shortShop, 5000)).toBe(250);
    });

    it("falls back to 10 points when bill is below 100", () => {
      const reward = calculateReward(sandeshShop, 50);
      expect(reward).toBe(10);
    });

    it("uses 5% - 7% slab for bills between 100 and 2000", () => {
      // 5% of 1000 = 50
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(calculateReward(sandeshShop, 1000)).toBe(50);

      // 7% of 1000 = 70
      vi.spyOn(Math, "random").mockReturnValue(1);
      expect(calculateReward(sandeshShop, 1000)).toBe(70);
    });

    it("uses 5% slab for bills between 2000 and 10000", () => {
      // 5% of 5000 = 250
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(calculateReward(sandeshShop, 5000)).toBe(250);

      vi.spyOn(Math, "random").mockReturnValue(1);
      expect(calculateReward(sandeshShop, 5000)).toBe(250);
    });

    it("uses 4% slab for bills between 10000 and 50000", () => {
      // 4% of 20000 = 800
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(calculateReward(sandeshShop, 20000)).toBe(800);

      vi.spyOn(Math, "random").mockReturnValue(1);
      expect(calculateReward(sandeshShop, 20000)).toBe(800);
    });

    it("caps effective bill amount at 50000 and uses 2% - 3% slab", () => {
      // 2% of 50000 = 1000
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(calculateReward(sandeshShop, 150000)).toBe(1000);

      // 3% of 50000 = 1500, capped at global max of 1000 points
      vi.spyOn(Math, "random").mockReturnValue(1);
      expect(calculateReward(sandeshShop, 150000)).toBe(1000);
    });
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

  it("validates customer name, address, mobile, and minimum purchase total", () => {
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
    ).toEqual({ ok: false, reason: "Purchase total must be at least 10." });
  });

  it("rejects bills above the shop maximum without creating a transaction", () => {
    const result = submitReward(
      shop({ maxBillAmount: 500 }),
      "Neha Patil",
      "Pune",
      "9876543210",
      501,
      [],
      visitorContext
    );

    expect(result).toEqual({ ok: false, reason: "Invalid amount." });
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

describe("Gift reward shops (TestKirana)", () => {
  const giftShop = shop({
    id: "TestKirana",
    name: "Test Kirana",
    maxReward: 1000,
    rewardType: "gift",
    rewardBands: [
      { minBill: 500, maxBill: 999, giftItems: "Sugar and tea" },
      { minBill: 1000, maxBill: 1999, giftItems: "Colgate and biscuits" },
      { minBill: 2000, giftItems: "300 cashback OR next time 20% discount" }
    ],
  });

  it("calculates 0 points for any purchase but returns gift details in calculation details", () => {
    // Under 500
    const r1 = calculateReward(giftShop, 400);
    expect(r1).toBe(0);

    // 500 - 999
    const r2 = calculateReward(giftShop, 600);
    expect(r2).toBe(0);
  });

  it("returns correct transaction details when submitting a gift shop transaction", () => {
    const result = submitReward(
      giftShop,
      "Neha Patil",
      "Pune",
      "9876543210",
      750,
      [],
      visitorContext
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.reward).toBe(0);
      expect(result.transaction.rewardType).toBe("gift");
      expect(result.transaction.giftItems).toBe("Sugar and tea");
    }
  });

  it("returns fallback details when bill amount is below the minimum slab", () => {
    const result = submitReward(
      giftShop,
      "Neha Patil",
      "Pune",
      "9876543210",
      300,
      [],
      visitorContext
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transaction.reward).toBe(0);
      expect(result.transaction.rewardType).toBe("gift");
      expect(result.transaction.giftItems).toBe("");
    }
  });
});
