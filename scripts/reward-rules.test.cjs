const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadTsModule(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const module = { exports: {} };
  const context = vm.createContext({
    exports: module.exports,
    module,
    require,
    console,
    Date,
    Math,
  });
  vm.runInContext(compiled, context, { filename: relativePath });
  return module.exports;
}

function loadAppsScriptRewardModule() {
  const source = fs.readFileSync(path.join(root, "apps-script/Code.gs"), "utf8");
  const module = { exports: {} };
  const context = vm.createContext({
    module,
    console,
    Date,
    Math,
  });
  vm.runInContext(
    `${source}\nmodule.exports = { calculateReward, getDefaultRewardRules, findPercentRewardRule, buildObjectRow };`,
    context,
    { filename: "apps-script/Code.gs" }
  );
  return module.exports;
}

function withRandom(value, callback) {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function makeShop(overrides = {}) {
  return {
    id: "TestShop",
    name: "Test Shop",
    category: "Test",
    status: "active",
    maxReward: 5000,
    costPerScan: 10,
    rewardBands: [],
    ...overrides,
  };
}

function assertRewardBounds(reward, label) {
  assert.equal(Number.isFinite(reward), true, `${label}: reward should be finite`);
  assert.ok(reward >= 10, `${label}: expected reward >= 10, got ${reward}`);
  assert.ok(reward <= 1000, `${label}: expected reward <= 1000, got ${reward}`);
}

function assertRewardDoesNotExceedBill(reward, bill, label) {
  if (bill < 10) return;
  assert.ok(reward <= Math.floor(bill), `${label}: expected reward <= bill ${bill}, got ${reward}`);
}

function runSuite(label, calculateReward) {
  const deterministicCases = [
    {
      name: "fixed band below universal minimum is raised to 10",
      random: 0,
      shop: makeShop({ rewardBands: [{ reward: 5, probability: 100 }] }),
      bill: 25000,
      expected: 10,
    },
    {
      name: "fixed band above universal maximum is capped at 1000",
      random: 0,
      shop: makeShop({ rewardBands: [{ reward: 5000, probability: 100 }] }),
      bill: 25000,
      expected: 1000,
    },
    {
      name: "fixed band above purchase total is capped at purchase total",
      random: 0,
      shop: makeShop({ rewardBands: [{ reward: 50, probability: 100 }] }),
      bill: 11,
      expected: 11,
    },
    {
      name: "shop maximum still applies inside universal maximum",
      random: 0,
      shop: makeShop({ maxReward: 600, rewardBands: [{ reward: 5000, probability: 100 }] }),
      bill: 25000,
      expected: 600,
    },
    {
      name: "universal minimum wins even when shop maximum is configured below 10",
      random: 0,
      shop: makeShop({ maxReward: 5, rewardBands: [{ reward: 5, probability: 100 }] }),
      bill: 25000,
      expected: 10,
    },
    {
      name: "no eligible fixed bands defaults to 10",
      random: 0,
      shop: makeShop({ rewardBands: [{ reward: 500, probability: 100, minBill: 1000 }] }),
      bill: 100,
      expected: 10,
    },
    {
      name: "percent rule below 10 rounds up to 10",
      random: 0,
      shop: makeShop({ rewardBands: [{ minBill: 50, maxBill: 500, minPercent: 1, maxPercent: 1 }] }),
      bill: 50,
      expected: 10,
    },
    {
      name: "percent rule above 1000 is capped",
      random: 1,
      shop: makeShop({ id: "RahulAgency", name: "Rahul Agency" }),
      bill: 50000,
      expected: 1000,
    },
    {
      name: "Rahul Agency 19500 bill can produce 420 cashback",
      random: 0.035,
      shop: makeShop({ id: "RahulAgency", name: "Rahul Agency" }),
      bill: 19500,
      expected: 420,
    },
  ];

  for (const testCase of deterministicCases) {
    const reward = withRandom(testCase.random, () => calculateReward(testCase.shop, testCase.bill));
    assert.equal(reward, testCase.expected, `${label}: ${testCase.name}`);
    assertRewardDoesNotExceedBill(reward, testCase.bill, `${label}: ${testCase.name}`);
  }

  const shops = [
    makeShop({
      id: "DefaultPercentShop",
      name: "Default Percent Shop",
      maxReward: 5000,
      rewardBands: [],
    }),
    makeShop({
      id: "RahulAgency",
      name: "Rahul Agency",
      maxReward: 5000,
      rewardBands: [],
    }),
    makeShop({
      id: "LowCapShop",
      name: "Low Cap Shop",
      maxReward: 25,
      rewardBands: [
        { reward: 5, probability: 20 },
        { reward: 25, probability: 40 },
        { reward: 2500, probability: 40 },
      ],
    }),
    makeShop({
      id: "HugeBandShop",
      name: "Huge Band Shop",
      maxReward: 5000,
      rewardBands: [
        { reward: 5, probability: 20 },
        { reward: 100, probability: 40 },
        { reward: 5000, probability: 40 },
      ],
    }),
  ];
  const bills = [1, 10, 49, 50, 99, 100, 499, 500, 999, 1000, 1999, 2000, 3499, 3500, 5999, 6000, 9999, 10000, 25000, 50000];

  for (const shop of shops) {
    for (const bill of bills) {
      for (let index = 0; index < 1000; index += 1) {
        const reward = calculateReward(shop, bill);
        assertRewardBounds(reward, `${label}: ${shop.id} bill ${bill} run ${index}`);
        assertRewardDoesNotExceedBill(reward, bill, `${label}: ${shop.id} bill ${bill} run ${index}`);
      }
    }
  }
}

const frontendReward = loadTsModule("src/rewardEngine.ts");
const appsScriptReward = loadAppsScriptRewardModule();
const data = loadTsModule("src/data.ts");

runSuite("frontend rewardEngine.ts", frontendReward.calculateReward);
runSuite("apps-script Code.gs", appsScriptReward.calculateReward);

{
  const existingTransactionHeaders = [
    "id",
    "mobile",
    "shopId",
    "billAmount",
    "reward",
    "status",
    "timestamp",
    "customerName",
    "address",
    "ipAddress",
    "location",
    "latitude",
    "longitude",
    "rewardRule",
    "rewardDetails",
  ];
  const row = appsScriptReward.buildObjectRow(existingTransactionHeaders, {
    id: "TRX-1",
    mobile: "9876543210",
    shopId: "RahulAgency",
    billAmount: 45000,
    reward: 1000,
    status: "approved",
    timestamp: "2026-05-15T00:00:00.000Z",
    customerName: "Test",
    address: "Pune",
    ipAddress: "Unknown",
    location: "Unknown",
    latitude: "",
    longitude: "",
    rewardRule: "percentage-slab",
    rewardDetails: "2.50% of 45000",
  });

  assert.equal(row[5], "approved", "append rows should respect existing status column position");
  assert.equal(row[13], "percentage-slab", "append rows should put rewardRule in the actual rewardRule column");
  assert.equal(row[14], "2.50% of 45000", "append rows should put rewardDetails in the actual rewardDetails column");
}

for (const shop of data.shops) {
  for (const band of shop.rewardBands) {
    if (Number.isFinite(band.reward)) {
      assert.ok(
        band.reward >= 10 && band.reward <= 1000,
        `seed shop ${shop.id} has out-of-range fixed reward ${band.reward}`
      );
    }
  }
}

console.log("Reward rules test suite passed for frontend, Apps Script, and seed data.");
