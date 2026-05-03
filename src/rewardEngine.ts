import type { RewardResult, Shop, Transaction } from "./types";

const todayKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const makeId = () => `TRX-${Math.floor(100000 + Math.random() * 900000)}`;

export function calculateReward(shop: Shop, billAmount: number): number {
  const eligibleBands = shop.rewardBands.filter(
    (band) => !band.minBill || billAmount >= band.minBill
  );
  const totalProbability = eligibleBands.reduce((sum, band) => sum + band.probability, 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;

  for (const band of eligibleBands) {
    cursor += band.probability;
    if (roll <= cursor) {
      return Math.min(band.reward, shop.maxReward);
    }
  }

  return Math.min(eligibleBands[0]?.reward ?? 5, shop.maxReward);
}

export function submitReward(
  shop: Shop,
  mobile: string,
  billAmount: number,
  existingTransactions: Transaction[]
): RewardResult {
  if (shop.status !== "active") {
    return { ok: false, reason: "This shop campaign is currently paused." };
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, reason: "Enter a valid 10 digit mobile number." };
  }

  if (!Number.isFinite(billAmount) || billAmount < 10) {
    return { ok: false, reason: "Bill amount must be at least ₹10." };
  }

  const alreadyRewardedToday = existingTransactions.some(
    (transaction) =>
      transaction.shopId === shop.id &&
      transaction.mobile === mobile &&
      transaction.status === "approved" &&
      todayKey(transaction.timestamp) === todayKey(new Date())
  );

  if (alreadyRewardedToday) {
    return {
      ok: false,
      reason: "This mobile number has already received today's reward at this shop.",
    };
  }

  const reward = calculateReward(shop, billAmount);

  return {
    ok: true,
    transaction: {
      id: makeId(),
      mobile,
      shopId: shop.id,
      billAmount,
      reward,
      status: "approved",
      timestamp: new Date().toISOString(),
    },
  };
}
