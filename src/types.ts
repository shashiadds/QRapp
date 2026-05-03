export type ShopStatus = "active" | "paused";

export type RewardBand = {
  reward: number;
  probability: number;
  minBill?: number;
};

export type Shop = {
  id: string;
  name: string;
  category: string;
  status: ShopStatus;
  maxReward: number;
  costPerScan: number;
  rewardBands: RewardBand[];
};

export type Transaction = {
  id: string;
  mobile: string;
  shopId: string;
  billAmount: number;
  reward: number;
  status: "approved" | "blocked";
  timestamp: string;
};

export type FraudSignal = {
  mobile: string;
  shopId: string;
  attempts: number;
  status: "watch" | "blocked";
};

export type RewardResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; reason: string };

export type AppData = {
  shops: Shop[];
  transactions: Transaction[];
  fraudSignals: FraudSignal[];
};
