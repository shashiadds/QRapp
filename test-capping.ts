import { calculateReward } from './src/rewardEngine';
import type { Shop } from './src/types';

function runTest(shopName: string, shopId: string, maxReward: number, testBills: number[]) {
  const shop: any = {
    id: shopId,
    name: shopName,
    category: 'General',
    status: 'active',
    maxReward: maxReward,
    costPerScan: 10,
    rewardBands: []
  };

  console.log(`\\n--- Testing ${shopName} (Shop Max Reward: ${maxReward}) ---`);
  
  for (const bill of testBills) {
    const rewards: number[] = [];
    for (let i = 0; i < 500; i++) {
      rewards.push(calculateReward(shop, bill));
    }
    const minR = Math.min(...rewards);
    const maxR = Math.max(...rewards);
    console.log(`Bill: ${bill.toLocaleString()} -> Capped Points Range: ${minR} - ${maxR}`);
  }
}

// 1. Default Rules (Kale Medical) - max tier maxBill is 10,000 (4-6%)
// Expect a bill of 15000000 to be treated as 10000, giving ~400-600 points
runTest('Kale Medical', 'kalemedical', 600, [6000, 10000, 20000, 15000000]);

// 2. Rahul Agency - max tier maxBill is 50,000 (2-7%)
// Expect a bill of 100000 to be treated as 50000, giving 1000 points (due to global max 1000)
// For a bill of 50000, 2% of 50000 = 1000 points, 7% of 50000 = 3500 points -> capped at 1000 points.
runTest('Rahul Agency', 'rahulagency', 1000, [10000, 50000, 100000, 200000]);

// 3. Srujan Kids House - max tier maxBill is 5,000 (5%)
// Expect a bill of 20000 to be treated as 5000, giving exactly 250 points
runTest('Srujan Kids House', 'srujankidshouse', 1000, [2000, 5000, 20000, 50000]);

// 4. Sandesh Agro Machinery - max tier maxBill is 50,000 (2-3%)
// Expect a bill of 150000 to be treated as 50000, giving 1000-1500 -> capped by shop max or global max
runTest('Sandesh Agro Machinery', 'sandeshagromachinery', 1000, [10000, 50000, 150000]);
