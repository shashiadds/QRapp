import { calculateReward } from './src/rewardEngine';

const mockShop: any = {
  id: 'srujankidshouse123',
  name: 'Srujan Kids House',
  category: 'Kids',
  status: 'active',
  maxReward: 1000,
  costPerScan: 10,
  rewardBands: []
};

function testReward(billAmount: number) {
  const rewards: number[] = [];
  for (let i = 0; i < 1000; i++) {
    rewards.push(calculateReward(mockShop, billAmount));
  }
  
  const minReward = Math.min(...rewards);
  const maxReward = Math.max(...rewards);
  
  console.log(`Bill: ${billAmount} | Expected Range: ${getExpectedRange(billAmount)} | Actual Range: ${minReward} - ${maxReward}`);
}

function getExpectedRange(billAmount: number) {
    // With the new probability rules, for any bill, the percentage can be:
    // - 5-7% (90% chance)
    // - 7-8% (7% chance)
    // - 10% (3% chance)
    // Thus the absolute min is 5% and absolute max is 10%.
    const min = Math.max(10, Math.floor((billAmount * 0.05) / 10) * 10);
    const max = Math.max(10, Math.floor((billAmount * 0.10) / 10) * 10);
    return `${min} - ${max}`;
}

console.log("Testing Srujan Kids House rules:\\n");
testReward(1000); // 50 - 100
testReward(2000); // 100 - 200
testReward(4000); // 200 - 400
testReward(5000); // 250 - 500
testReward(10000); // 500 - 1000
