import type { RewardResult, Shop, Transaction, VisitorContext } from "./types";

const MIN_POINTS = 10;
const MAX_POINTS = 1000;

const makeId = () => `TRX-${Math.floor(100000 + Math.random() * 900000)}`;

export function calculateReward(shop: Shop, billAmount: number): number {
  const percentRule = findPercentRewardRule(shop, billAmount);
  if (percentRule) {
    const percent = randomBetween(percentRule.minPercent, percentRule.maxPercent);
    return clampPoints(roundRewardAmount((billAmount * percent) / 100), shop);
  }

  const eligibleBands = shop.rewardBands.filter(
    (band) =>
      Number.isFinite(band.reward) &&
      Number.isFinite(band.probability) &&
      (!band.minBill || billAmount >= band.minBill)
  );

  if (!eligibleBands.length) {
    return 10;
  }

  const totalProbability = eligibleBands.reduce((sum, band) => sum + (band.probability ?? 0), 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;

  for (const band of eligibleBands) {
    cursor += band.probability ?? 0;
    if (roll <= cursor) {
      return clampPoints(band.reward ?? MIN_POINTS, shop);
    }
  }

  return clampPoints(eligibleBands[0]?.reward ?? MIN_POINTS, shop);
}

function getShopRewardRules(shop: Shop) {
  const lookup = normalizeLookup(`${shop.id} ${shop.name}`);

  if (lookup.includes("rahulagency")) {
    return [
      { minBill: 0, maxBill: 1000, minPercent: 10, maxPercent: 15 },
      { minBill: 1000, maxBill: 5000, minPercent: 10, maxPercent: 20 },
      { minBill: 5000, maxBill: 10000, minPercent: 10, maxPercent: 15 },
      { minBill: 10000, maxBill: 50000, minPercent: 2, maxPercent: 7 },
    ];
  }

  return getDefaultRewardRules();
}

function getDefaultRewardRules() {
  return [
    { minBill: 50, maxBill: 500, minPercent: 8, maxPercent: 15 },
    { minBill: 500, maxBill: 1000, minPercent: 5, maxPercent: 10 },
    { minBill: 1000, maxBill: 2000, minPercent: 7, maxPercent: 15 },
    { minBill: 2000, maxBill: 3500, minPercent: 5, maxPercent: 10 },
    { minBill: 3500, maxBill: 6000, minPercent: 5, maxPercent: 8 },
    { minBill: 6000, maxBill: 10000, minPercent: 4, maxPercent: 6 },
  ];
}

function findPercentRewardRule(shop: Shop, billAmount: number) {
  return getShopRewardRules(shop).find(
    (rule) =>
      Number.isFinite(rule.minPercent) &&
      Number.isFinite(rule.maxPercent) &&
      billAmount >= (rule.minBill ?? 0) &&
      (!Number.isFinite(rule.maxBill) || billAmount <= Number(rule.maxBill))
  );
}

function randomBetween(min = 0, max = 0) {
  return min + Math.random() * (max - min);
}

function roundRewardAmount(amount: number) {
  return Math.max(MIN_POINTS, Math.floor(amount / 10) * 10);
}

function clampPoints(amount: number, shop: Shop) {
  const shopLimit = Number.isFinite(shop.maxReward) ? shop.maxReward : MAX_POINTS;
  return Math.max(MIN_POINTS, Math.min(amount, shopLimit, MAX_POINTS));
}

function normalizeLookup(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function submitReward(
  shop: Shop,
  customerName: string,
  address: string,
  mobile: string,
  billAmount: number,
  existingTransactions: Transaction[],
  visitorContext: VisitorContext
): RewardResult {
  if (shop.status !== "active") {
    return { ok: false, reason: "This shop is not accepting new scans." };
  }

  if (!customerName.trim()) {
    return { ok: false, reason: "Enter customer name." };
  }

  if (!address.trim()) {
    return { ok: false, reason: "Enter customer address." };
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, reason: "Enter a valid 10 digit mobile number." };
  }

  if (!Number.isFinite(billAmount) || billAmount < 10) {
    return { ok: false, reason: "Purchase total must be at least 10." };
  }

  const reward = calculateReward(shop, billAmount);

  return {
    ok: true,
    transaction: {
      id: makeId(),
      customerName: customerName.trim(),
      address: address.trim(),
      ipAddress: visitorContext.ipAddress,
      location: visitorContext.location,
      latitude: visitorContext.latitude,
      longitude: visitorContext.longitude,
      mobile,
      shopId: shop.id,
      billAmount,
      reward,
      status: "approved",
      timestamp: new Date().toISOString(),
    },
  };
}
