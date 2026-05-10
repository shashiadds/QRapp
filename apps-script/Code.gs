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
    500,
    10,
    JSON.stringify([
      { reward: 5, probability: 40 },
      { reward: 10, probability: 25 },
      { reward: 20, probability: 15 },
      { reward: 50, probability: 10 },
      { reward: 100, probability: 7, minBill: 100 },
      { reward: 500, probability: 3, minBill: 250 },
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

  return jsonResponse({ ok: false, reason: "Unknown action." });
}

// Admin authentication logic
function readAdmins() {
  return readObjects(SHEETS.admins).map((row) => ({
    username: String(row.username),
    password: String(row.password),
    role: String(row.role || "admin"), // fallback for existing rows
    shopId: String(row.shopId || ""),
  }));
}

function adminLogin(username, password) {
  const admins = readAdmins();
  const found = admins.find(
    (admin) => admin.username === username && admin.password === password
  );
  if (found) {
    return { ok: true, isAdmin: found.role === "admin", role: found.role, shopId: found.shopId };
  }
  return { ok: false, reason: "Invalid username or password." };
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
    return { ok: false, reason: "This shop campaign is currently paused." };
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

  const alreadyRewardedToday = readTransactions().some((transaction) => {
    return (
      transaction.shopId === shop.id &&
      transaction.mobile === String(mobile) &&
      transaction.status === "approved" &&
      dateKey(transaction.timestamp) === dateKey(new Date())
    );
  });

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
  const eligibleBands = shop.rewardBands.filter((band) => !band.minBill || billAmount >= band.minBill);
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
