import type { RewardResult, Shop, Transaction, VisitorContext } from "./types";

const MIN_POINTS = 10;
const MAX_POINTS = 1000;

const makeId = () => `TRX-${Math.floor(100000 + Math.random() * 900000)}`;

type RewardCalculation = {
  points: number;
  rule: string;
  details: string;
};

export function calculateReward(shop: Shop, billAmount: number): number {
  return calculateRewardDetails(shop, billAmount).points;
}

function calculateRewardDetails(shop: Shop, billAmount: number): RewardCalculation {
  const rules = getShopRewardRules(shop);
  let highestMaxBill = 0;
  for (const rule of rules) {
    if (Number.isFinite(rule.maxBill) && rule.maxBill! > highestMaxBill) {
      highestMaxBill = rule.maxBill!;
    }
  }

  let effectiveBillAmount = billAmount;
  if (highestMaxBill > 0 && billAmount > highestMaxBill) {
    effectiveBillAmount = highestMaxBill;
  }

  const percentRule = findPercentRewardRule(shop, effectiveBillAmount);
  if (percentRule) {
    const percent = randomBetween(percentRule.minPercent, percentRule.maxPercent);
    const rawPoints = (effectiveBillAmount * percent) / 100;
    const roundedPoints = roundRewardAmount(rawPoints);
    return finalizePoints(roundedPoints, shop, billAmount, {
      rule: "percentage-slab",
      details: `${percent.toFixed(2)}% of ${effectiveBillAmount} (capped from ${billAmount}), rounded from ${rawPoints.toFixed(2)} to ${roundedPoints}`,
    });
  }

  const eligibleBands = shop.rewardBands.filter(
    (band) =>
      Number.isFinite(band.reward) &&
      Number.isFinite(band.probability) &&
      (!band.minBill || billAmount >= band.minBill)
  );

  if (!eligibleBands.length) {
    return finalizePoints(MIN_POINTS, shop, billAmount, {
      rule: "minimum-fallback",
      details: "No percentage slab or fixed reward band matched.",
    });
  }

  const totalProbability = eligibleBands.reduce((sum, band) => sum + (band.probability ?? 0), 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;

  for (const band of eligibleBands) {
    cursor += band.probability ?? 0;
    if (roll <= cursor) {
      return finalizePoints(band.reward ?? MIN_POINTS, shop, billAmount, {
        rule: "fixed-probability-band",
        details: `${band.reward ?? MIN_POINTS} point band selected from roll ${roll.toFixed(4)} of ${totalProbability}`,
      });
    }
  }

  return finalizePoints(eligibleBands[0]?.reward ?? MIN_POINTS, shop, billAmount, {
    rule: "fixed-probability-fallback",
    details: "Probability cursor did not select a band; first eligible band used.",
  });
}

function getShopRewardRules(shop: Shop) {
  const lookup = normalizeLookup(`${shop.id} ${shop.name}`);

  if (lookup.includes("srujankidshouse")) {
    return [
      { minBill: 100, minPercent: 5, maxPercent: 10, probability: 90 },
      { minBill: 100, minPercent: 7, maxPercent: 8, probability: 7 },
      { minBill: 100, minPercent: 10, maxPercent: 10, probability: 3 },
    ];
  }

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
  const matchingRules = getShopRewardRules(shop).filter(
    (rule) =>
      Number.isFinite(rule.minPercent) &&
      Number.isFinite(rule.maxPercent) &&
      billAmount >= (rule.minBill ?? 0) &&
      (!Number.isFinite(rule.maxBill) || billAmount <= Number(rule.maxBill))
  );

  if (!matchingRules.length) return undefined;

  const hasProbability = matchingRules.some((r) => "probability" in r && Number.isFinite(r.probability));
  if (!hasProbability) return matchingRules[0];

  const totalProbability = matchingRules.reduce((sum, r) => sum + (("probability" in r ? r.probability : 0) as number), 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;
  for (const rule of matchingRules) {
    cursor += ("probability" in rule ? rule.probability : 0) as number;
    if (roll <= cursor) return rule;
  }
  return matchingRules[0];
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

function finalizePoints(
  amount: number,
  shop: Shop,
  billAmount: number,
  source: { rule: string; details: string }
): RewardCalculation {
  const points = clampPoints(amount, shop);
  const caps = [`shopMax=${shop.maxReward}`, `globalMax=${MAX_POINTS}`];
  let finalPoints = points;
  if (!Number.isFinite(billAmount) || billAmount < MIN_POINTS) {
    return {
      points: finalPoints,
      rule: source.rule,
      details: `${source.details}; raw=${amount}; capped=${finalPoints}; caps=${caps.join(", ")}`,
    };
  }

  finalPoints = Math.min(points, Math.floor(billAmount));
  caps.push(`purchaseTotal=${Math.floor(billAmount)}`);
  return {
    points: finalPoints,
    rule: source.rule,
    details: `${source.details}; raw=${amount}; capped=${finalPoints}; caps=${caps.join(", ")}`,
  };
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

  const rewardCalculation = calculateRewardDetails(shop, billAmount);

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
      reward: rewardCalculation.points,
      rewardRule: rewardCalculation.rule,
      rewardDetails: rewardCalculation.details,
      status: "approved",
      timestamp: new Date().toISOString(),
    },
  };
}
