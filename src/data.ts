import type { FraudSignal, Shop, Transaction } from "./types";

export const shops: Shop[] = [
  {
    id: "KaleMedical",
    name: "Kale Medical",
    category: "Medical Store",
    status: "active",
    maxReward: 500,
    costPerScan: 10,
    rewardBands: [
      { reward: 5, probability: 40 },
      { reward: 10, probability: 25 },
      { reward: 20, probability: 15 },
      { reward: 50, probability: 10 },
      { reward: 100, probability: 7, minBill: 100 },
      { reward: 500, probability: 3, minBill: 250 },
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
