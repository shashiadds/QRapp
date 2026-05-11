import type { FraudSignal, Shop, Transaction } from "./types";

export const shops: Shop[] = [
  {
    id: "KaleMedical",
    name: "Kale Medical",
    category: "Medical Store",
    status: "active",
    maxReward: 600,
    costPerScan: 10,
    rewardBands: [
      { minBill: 50, maxBill: 500, minPercent: 8, maxPercent: 15 },
      { minBill: 500, maxBill: 1000, minPercent: 5, maxPercent: 10 },
      { minBill: 1000, maxBill: 2000, minPercent: 7, maxPercent: 15 },
      { minBill: 2000, maxBill: 3500, minPercent: 5, maxPercent: 10 },
      { minBill: 3500, maxBill: 6000, minPercent: 5, maxPercent: 8 },
      { minBill: 6000, maxBill: 10000, minPercent: 4, maxPercent: 6 },
    ],
  },
  {
    id: "PatilStore",
    name: "Patil Kirana",
    category: "Kirana Shop",
    status: "active",
    maxReward: 100,
    costPerScan: 8,
    rewardBands: [
      { reward: 5, probability: 50 },
      { reward: 10, probability: 25 },
      { reward: 20, probability: 15 },
      { reward: 50, probability: 8, minBill: 100 },
      { reward: 100, probability: 2, minBill: 200 },
    ],
  },
  {
    id: "JoshiMart",
    name: "Joshi Mini Mart",
    category: "Retail",
    status: "paused",
    maxReward: 50,
    costPerScan: 6,
    rewardBands: [
      { reward: 5, probability: 60 },
      { reward: 10, probability: 25 },
      { reward: 20, probability: 10 },
      { reward: 50, probability: 5, minBill: 150 },
    ],
  },
];

export const transactions: Transaction[] = [];

export const fraudSignals: FraudSignal[] = [];
