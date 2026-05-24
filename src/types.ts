export type ShopStatus = "active" | "paused" | "deleted";

export type RewardBand = {
  reward?: number;
  probability?: number;
  minBill?: number;
  maxBill?: number;
  minPercent?: number;
  maxPercent?: number;
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
  customerName: string;
  address: string;
  ipAddress: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  mobile: string;
  shopId: string;
  billAmount: number;
  reward: number;
  rewardRule?: string;
  rewardDetails?: string;
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
  shopPasswords?: Record<string, string>;
};

export type PublicAppData = {
  shops: Shop[];
};

export type Session = {
  role: string;
  shopId?: string;
  token?: string;
};

export type VisitorContext = {
  ipAddress: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
};
