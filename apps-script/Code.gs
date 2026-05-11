const SHEETS = {
  shops: "shops",
  transactions: "transactions",
  fraud: "fraud",
  admins: "admins",
};

const HEADERS = {
  shops: ["id", "name", "category", "status", "maxReward", "costPerScan", "rewardBands"],
  transactions: [
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
  ],
  fraud: ["mobile", "shopId", "attempts", "status", "updatedAt"],
  admins: ["username", "password", "role", "shopId"],
};

const SEED_SHOPS = [
  [
    "KaleMedical",
    "Kale Medical",
    "Medical Store",
    "active",
    600,
    10,
    JSON.stringify([
      { minBill: 100, maxBill: 500, minPercent: 8, maxPercent: 15 },
      { minBill: 500, maxBill: 1000, minPercent: 5, maxPercent: 10 },
      { minBill: 1000, maxBill: 2000, minPercent: 7, maxPercent: 15 },
      { minBill: 2000, maxBill: 3500, minPercent: 5, maxPercent: 10 },
      { minBill: 3500, maxBill: 6000, minPercent: 5, maxPercent: 8 },
      { minBill: 6000, maxBill: 10000, minPercent: 4, maxPercent: 6 },
    ]),
  ],
  [
    "PatilStore",
    "Patil Kirana",
    "Kirana Shop",
    "active",
    100,
    8,
    JSON.stringify([
      { reward: 5, probability: 50 },
      { reward: 10, probability: 25 },
      { reward: 20, probability: 15 },
      { reward: 50, probability: 8, minBill: 100 },
      { reward: 100, probability: 2, minBill: 200 },
    ]),
  ],
];

function setupSmartMudraSheet() {
  const spreadsheet = SpreadsheetApp.getActive();

  Object.keys(SHEETS).forEach((key) => {
    const name = SHEETS[key];
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      sheet.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
      sheet.setFrozenRows(1);
      // Seed shops and admins only if sheet is new
      if (key === "shops") {
        sheet.getRange(2, 1, SEED_SHOPS.length, HEADERS.shops.length).setValues(SEED_SHOPS);
      }
      if (key === "admins") {
        // Add a default admin (username: admin, password: admin123) - change after first login
        sheet.getRange(2, 1, 1, 2).setValues([["admin", "admin123"]]);
      }
    } else {
      // Only ensure headers if sheet exists, do not clear data
      ensureHeaders(name, HEADERS[key]);
    }
  });
}

function doGet(event) {
  const action = event.parameter.action || "bootstrap";

  if (action === "bootstrap") {
    return jsonResponse({
      shops: readShops(),
      transactions: readTransactions(),
      fraudSignals: readFraudSignals(),
    });
  }

  return jsonResponse({ ok: false, reason: "Unknown action." });
}

function doPost(event) {
  const body = JSON.parse(event.postData.contents || "{}");

  if (body.action === "submitReward") {
    return jsonResponse(
      submitReward(
        body.shopId,
        body.customerName,
        body.address,
        body.ipAddress,
        body.location,
        body.latitude,
        body.longitude,
        body.mobile,
        Number(body.billAmount)
      )
    );
  }

  if (body.action === "adminLogin") {
    return jsonResponse(adminLogin(body.username, body.password));
  }

  if (body.action === "addShop") {
    return jsonResponse(addShop(body.shop));
  }

  if (body.action === "deleteShop") {
    return jsonResponse(deleteShop(body.shopId));
  }

  return jsonResponse({ ok: false, reason: "Unknown action." });
}

// Admin authentication logic
function normalizeLookup(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function findShopForLogin(value, shops) {
  const target = normalizeLookup(value);
  return shops.find((shop) => {
    return normalizeLookup(shop.id) === target || normalizeLookup(shop.name) === target;
  });
}

function readAdmins() {
  const shops = readShops();
  return readObjects(SHEETS.admins).map((row) => ({
    username: String(row.username),
    password: String(row.password),
    role: String(row.role || "").trim(),
    shopId: String(row.shopId || "").trim(),
  })).map((admin) => {
    const shopFromShopId = findShopForLogin(admin.shopId, shops);
    const shopFromUsername = findShopForLogin(admin.username, shops);

    if (admin.role === "shopAdmin") {
      return { ...admin, shopId: (shopFromShopId || shopFromUsername)?.id || admin.shopId };
    }

    if (admin.role) {
      return admin;
    }

    if (shopFromShopId || shopFromUsername) {
      return { ...admin, role: "shopAdmin", shopId: (shopFromShopId || shopFromUsername).id };
    }

    return { ...admin, role: "admin" };
  });
}

function adminLogin(username, password) {
  const found = findAdminByCredentials(username, password);
  if (found) {
    return { ok: true, isAdmin: found.role === "admin", role: found.role, shopId: found.shopId };
  }
  return { ok: false, reason: "Invalid username or password." };
}

function findAdminByCredentials(username, password) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.admins);
  ensureHeaders(SHEETS.admins, HEADERS.admins);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const usernameIndex = headers.indexOf("username");
  const passwordIndex = headers.indexOf("password");
  const roleIndex = headers.indexOf("role");
  const shopIdIndex = headers.indexOf("shopId");
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (String(row[usernameIndex]) !== String(username) || String(row[passwordIndex]) !== String(password)) {
      continue;
    }

    const role = String(row[roleIndex] || "").trim();
    const shopId = String(row[shopIdIndex] || "").trim();
    return normalizeAdminAccount(String(row[usernameIndex]), role, shopId);
  }

  return null;
}

function normalizeAdminAccount(username, role, shopId) {
  const shops = readShops();
  const shopFromShopId = findShopForLogin(shopId, shops);
  const shopFromUsername = findShopForLogin(username, shops);

  if (role === "shopAdmin") {
    return { username: username, role: role, shopId: (shopFromShopId || shopFromUsername)?.id || shopId };
  }

  if (role) {
    return { username: username, role: role, shopId: shopId };
  }

  if (shopFromShopId || shopFromUsername) {
    return { username: username, role: "shopAdmin", shopId: (shopFromShopId || shopFromUsername).id };
  }

  return { username: username, role: "admin", shopId: shopId };
}

function addShop(shopData) {
  const shopId = String(shopData.name).replace(/\s+/g, "").toLowerCase() + Math.floor(100 + Math.random() * 900);
  const defaultPassword = "pass" + Math.floor(1000 + Math.random() * 9000);
  
  const newShop = {
    id: shopId,
    name: String(shopData.name),
    category: String(shopData.category || "General"),
    status: "active",
    maxReward: Number(shopData.maxReward || 100),
    costPerScan: Number(shopData.costPerScan || 10),
    rewardBands: JSON.stringify([
      { reward: 5, probability: 50 },
      { reward: 10, probability: 30 },
      { reward: 50, probability: 15, minBill: 100 },
      { reward: 100, probability: 5, minBill: 500 }
    ])
  };

  appendObject(SHEETS.shops, HEADERS.shops, newShop);

  const adminRow = {
    username: shopId,
    password: defaultPassword,
    role: "shopAdmin",
    shopId: shopId
  };
  appendObject(SHEETS.admins, HEADERS.admins, adminRow);

  return { ok: true, shop: newShop, credentials: { username: shopId, password: defaultPassword } };
}

function deleteShop(shopId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.shops);
  ensureHeaders(SHEETS.shops, HEADERS.shops);

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const statusIndex = headers.indexOf("status");
  const targetShopId = String(shopId);

  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idIndex]) === targetShopId) {
      sheet.getRange(index + 1, statusIndex + 1).setValue("deleted");
      const shop = readShops().find((item) => item.id === targetShopId);
      return { ok: true, shop: shop };
    }
  }

  return { ok: false, reason: "Shop not found." };
}

function submitReward(
  shopId,
  customerName,
  address,
  ipAddress,
  location,
  latitude,
  longitude,
  mobile,
  billAmount
) {
  const shop = readShops().find((item) => item.id === shopId);

  if (!shop) {
    return { ok: false, reason: "Shop not found." };
  }

  if (shop.status !== "active") {
    return { ok: false, reason: "This shop is not accepting new scans." };
  }

  if (!String(customerName || "").trim()) {
    return { ok: false, reason: "Enter customer name." };
  }

  if (!String(address || "").trim()) {
    return { ok: false, reason: "Enter customer address." };
  }

  if (!/^[6-9]\d{9}$/.test(String(mobile))) {
    return { ok: false, reason: "Enter a valid 10 digit mobile number." };
  }

  if (!Number.isFinite(billAmount) || billAmount < 10) {
    return { ok: false, reason: "Bill amount must be at least Rs 10." };
  }

  const alreadyRewardedToday = hasApprovedRewardToday(shop.id, String(mobile));

  if (alreadyRewardedToday) {
    recordFraudAttempt(String(mobile), shop.id);
    return {
      ok: false,
      reason: "This mobile number has already received today's reward at this shop.",
    };
  }

  const transaction = {
    id: makeTransactionId(),
    customerName: String(customerName).trim(),
    address: String(address).trim(),
    ipAddress: String(ipAddress || "Unknown"),
    location: String(location || "Unknown"),
    latitude: latitude === null || latitude === undefined ? "" : Number(latitude),
    longitude: longitude === null || longitude === undefined ? "" : Number(longitude),
    mobile: String(mobile),
    shopId: shop.id,
    billAmount,
    reward: calculateReward(shop, billAmount),
    status: "approved",
    timestamp: new Date().toISOString(),
  };

  appendObject(SHEETS.transactions, HEADERS.transactions, transaction);
  return { ok: true, transaction };
}

function calculateReward(shop, billAmount) {
  const percentRule = findPercentRewardRule(shop, billAmount);
  if (percentRule) {
    const percent = randomBetween(percentRule.minPercent, percentRule.maxPercent);
    return roundRewardAmount((billAmount * percent) / 100);
  }

  const eligibleBands = shop.rewardBands.filter((band) => {
    return (
      Number.isFinite(Number(band.reward)) &&
      Number.isFinite(Number(band.probability)) &&
      (!band.minBill || billAmount >= band.minBill)
    );
  });

  if (!eligibleBands.length) {
    return 10;
  }

  const totalProbability = eligibleBands.reduce((sum, band) => sum + Number(band.probability), 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;

  for (let index = 0; index < eligibleBands.length; index += 1) {
    const band = eligibleBands[index];
    cursor += Number(band.probability);
    if (roll <= cursor) {
      return Math.min(Number(band.reward), Number(shop.maxReward));
    }
  }

  return Math.min(Number(eligibleBands[0] && eligibleBands[0].reward) || 5, Number(shop.maxReward));
}

function getShopRewardRules(shop) {
  const lookup = normalizeLookup(shop.id + " " + shop.name);

  if (lookup.indexOf("rahulagency") !== -1) {
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
    { minBill: 100, maxBill: 500, minPercent: 8, maxPercent: 15 },
    { minBill: 500, maxBill: 1000, minPercent: 5, maxPercent: 10 },
    { minBill: 1000, maxBill: 2000, minPercent: 7, maxPercent: 15 },
    { minBill: 2000, maxBill: 3500, minPercent: 5, maxPercent: 10 },
    { minBill: 3500, maxBill: 6000, minPercent: 5, maxPercent: 8 },
    { minBill: 6000, maxBill: 10000, minPercent: 4, maxPercent: 6 },
  ];
}

function findPercentRewardRule(shop, billAmount) {
  return getShopRewardRules(shop).find((rule) => {
    return (
      Number.isFinite(Number(rule.minPercent)) &&
      Number.isFinite(Number(rule.maxPercent)) &&
      billAmount >= Number(rule.minBill || 0) &&
      (!Number.isFinite(Number(rule.maxBill)) || billAmount <= Number(rule.maxBill))
    );
  });
}

function randomBetween(min, max) {
  const minValue = Number(min);
  const maxValue = Number(max);
  return minValue + Math.random() * (maxValue - minValue);
}

function roundRewardAmount(amount) {
  return Math.max(10, Math.floor(Number(amount) / 10) * 10);
}

function readShops() {
  return readObjects(SHEETS.shops).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    status: String(row.status),
    maxReward: Number(row.maxReward),
    costPerScan: Number(row.costPerScan),
    rewardBands: JSON.parse(row.rewardBands || "[]"),
  }));
}

function readTransactions() {
  return readObjects(SHEETS.transactions)
    .map((row) => ({
      id: String(row.id),
      customerName: String(row.customerName || ""),
      address: String(row.address || ""),
      ipAddress: String(row.ipAddress || ""),
      location: String(row.location || ""),
      latitude: row.latitude === "" ? null : Number(row.latitude),
      longitude: row.longitude === "" ? null : Number(row.longitude),
      mobile: String(row.mobile),
      shopId: String(row.shopId),
      billAmount: Number(row.billAmount),
      reward: Number(row.reward),
      status: String(row.status),
      timestamp: String(row.timestamp),
    }))
    .reverse();
}

function hasApprovedRewardToday(shopId, mobile) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.transactions);
  ensureHeaders(SHEETS.transactions, HEADERS.transactions);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mobileIndex = headers.indexOf("mobile");
  const shopIdIndex = headers.indexOf("shopId");
  const statusIndex = headers.indexOf("status");
  const timestampIndex = headers.indexOf("timestamp");
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const today = dateKey(new Date());

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const timestamp = row[timestampIndex];
    if (!timestamp) {
      continue;
    }

    const transactionDate = dateKey(timestamp);
    if (transactionDate < today) {
      break;
    }

    if (
      transactionDate === today &&
      String(row[shopIdIndex]) === String(shopId) &&
      String(row[mobileIndex]) === String(mobile) &&
      String(row[statusIndex]) === "approved"
    ) {
      return true;
    }
  }

  return false;
}

function readFraudSignals() {
  return readObjects(SHEETS.fraud).map((row) => ({
    mobile: String(row.mobile),
    shopId: String(row.shopId),
    attempts: Number(row.attempts),
    status: String(row.status),
  }));
}

function recordFraudAttempt(mobile, shopId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.fraud);
  const rows = sheet.getDataRange().getValues();

  for (let index = 1; index < rows.length; index += 1) {
    if (String(rows[index][0]) === mobile && String(rows[index][1]) === shopId) {
      const attempts = Number(rows[index][2]) + 1;
      sheet.getRange(index + 1, 3, 1, 3).setValues([
        [attempts, attempts >= 5 ? "blocked" : "watch", new Date().toISOString()],
      ]);
      return;
    }
  }

  sheet.appendRow([mobile, shopId, 1, "watch", new Date().toISOString()]);
}

function readObjects(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();

  return values
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      return headers.reduce((object, header, index) => {
        object[header] = row[index];
        return object;
      }, {});
    });
}

function appendObject(sheetName, headers, object) {
  ensureHeaders(sheetName, headers);
  const row = headers.map((header) => object[header]);
  SpreadsheetApp.getActive().getSheetByName(sheetName).appendRow(row);
}

function ensureHeaders(sheetName, headers) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const missingHeaders = headers.filter((header) => currentHeaders.indexOf(header) === -1);

  if (!missingHeaders.length) {
    return;
  }

  const nextColumn = currentHeaders.filter((header) => header !== "").length + 1;
  sheet.getRange(1, nextColumn, 1, missingHeaders.length).setValues([missingHeaders]);
}

function makeTransactionId() {
  return "TRX-" + Math.floor(100000 + Math.random() * 900000);
}

function dateKey(value) {
  return Utilities.formatDate(new Date(value), "Asia/Kolkata", "yyyy-MM-dd");
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, ...data })).setMimeType(
    ContentService.MimeType.JSON
  );
}

function emailDailyReport() {
  const emailAddress = "shashi.adsure@gmail.com,exmudra@gmail.com";
  const subject = "Smart Mudra - Daily Report";
  const body = "Please find attached the daily report copy for Smart Mudra.";
  
  const spreadsheetId = "1WfgPOw_ulgFCvPWcBxfy92s2prx8WWbUv4EKC-D5QHA";
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // Update the summary sheet before exporting
  updateSummarySheet(spreadsheet);
  SpreadsheetApp.flush(); // Ensure changes are saved before export
  
  // Wait a few seconds to ensure Google's export API sees the new sheet
  Utilities.sleep(5000);
  
  const url = "https://docs.google.com/spreadsheets/d/" + spreadsheetId + "/export?format=xlsx";
  
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  
  const blob = response.getBlob().setName(spreadsheet.getName() + " - " + dateKey(new Date()) + ".xlsx");
  
  MailApp.sendEmail({
    to: emailAddress,
    subject: subject,
    body: body,
    attachments: [blob]
  });
}

function updateSummarySheet(spreadsheet) {
  const sheetName = "Summary";
  let summarySheet = spreadsheet.getSheetByName(sheetName);
  if (!summarySheet) {
    summarySheet = spreadsheet.insertSheet(sheetName);
  }
  
  summarySheet.clear();
  
  const transactionsSheet = spreadsheet.getSheetByName(SHEETS.transactions);
  if (!transactionsSheet) return;
  const values = transactionsSheet.getDataRange().getValues();
  if (values.length <= 1) {
    summarySheet.appendRow(["Date", "Shop ID", "Total Bills Amount", "Total Cashbacks"]);
    return;
  }
  
  const headers = values[0];
  const shopIdIdx = headers.indexOf("shopId");
  const billAmountIdx = headers.indexOf("billAmount");
  const rewardIdx = headers.indexOf("reward");
  const timestampIdx = headers.indexOf("timestamp");
  const statusIdx = headers.indexOf("status");
  
  const summaryData = {};
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = String(row[statusIdx]);
    if (status !== "approved") continue;
    
    const timestamp = row[timestampIdx];
    const date = dateKey(timestamp);
    const shopId = row[shopIdIdx];
    const billAmount = Number(row[billAmountIdx]) || 0;
    const reward = Number(row[rewardIdx]) || 0;
    
    const key = date + "|" + shopId;
    if (!summaryData[key]) {
      summaryData[key] = {
        date: date,
        shopId: shopId,
        totalBills: 0,
        totalCashbacks: 0
      };
    }
    
    summaryData[key].totalBills += billAmount;
    summaryData[key].totalCashbacks += reward;
  }
  
  const outputRows = [["Date", "Shop ID", "Total Bills Amount", "Total Cashbacks"]];
  
  const sortedKeys = Object.keys(summaryData).sort((a, b) => b.localeCompare(a));
  
  sortedKeys.forEach(key => {
    const data = summaryData[key];
    outputRows.push([data.date, data.shopId, data.totalBills, data.totalCashbacks]);
  });
  
  summarySheet.getRange(1, 1, outputRows.length, 4).setValues(outputRows);
  summarySheet.setFrozenRows(1);
}

function setupDailyReportTrigger() {
  // Clear existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'emailDailyReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Set up daily trigger (runs between 23:00 and midnight)
  ScriptApp.newTrigger('emailDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();
}
