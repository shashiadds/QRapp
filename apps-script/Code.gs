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
