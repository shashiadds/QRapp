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

export const transactions: Transaction[] = [
  {
    id: "TRX-1041",
    mobile: "9876543210",
    shopId: "KaleMedical",
    billAmount: 340,
    reward: 20,
    status: "approved",
    timestamp: "2026-05-03T09:15:00+05:30",
  },
  {
    id: "TRX-1042",
    mobile: "9822014455",
    shopId: "KaleMedical",
    billAmount: 128,
    reward: 10,
    status: "approved",
    timestamp: "2026-05-03T10:30:00+05:30",
  },
  {
    id: "TRX-1043",
    mobile: "9766881122",
    shopId: "PatilStore",
    billAmount: 720,
    reward: 50,
    status: "approved",
    timestamp: "2026-05-02T19:05:00+05:30",
  },
  {
    id: "TRX-1044",
    mobile: "9876543210",
    shopId: "KaleMedical",
    billAmount: 80,
    reward: 5,
    status: "blocked",
    timestamp: "2026-05-03T12:10:00+05:30",
  },
];

export const fraudSignals: FraudSignal[] = [
  { mobile: "9876543210", shopId: "KaleMedical", attempts: 2, status: "watch" },
  { mobile: "9000001111", shopId: "PatilStore", attempts: 5, status: "blocked" },
];
