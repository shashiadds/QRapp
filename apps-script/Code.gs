const SHEETS = {
  shops: "shops",
  transactions: "transactions",
  transactionArchive: "transactions_archive",
  fraud: "fraud",
  admins: "admins",
  sessions: "sessions",
};

const MIN_POINTS = 10;
const MAX_POINTS = 1000;

const HEADERS = {
  shops: ["id", "name", "category", "status", "maxReward", "costPerScan", "rewardBands"],
  transactions: [
    "id",
    "mobile",
    "shopId",
    "billAmount",
    "reward",
    "rewardRule",
    "rewardDetails",
    "status",
    "timestamp",
    "customerName",
    "address",
    "ipAddress",
    "location",
    "latitude",
    "longitude",
  ],
  transactionArchive: [
    "id",
    "mobile",
    "shopId",
    "billAmount",
    "reward",
    "rewardRule",
    "rewardDetails",
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
  admins: ["username", "password", "passwordSalt", "passwordHash", "role", "shopId"],
  sessions: ["token", "username", "role", "shopId", "expiresAt", "createdAt"],
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
      { minBill: 50, maxBill: 500, minPercent: 8, maxPercent: 15 },
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
      { reward: 10, probability: 75 },
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
        const temporaryPassword = makeTemporaryPassword();
        const passwordRecord = hashPassword(temporaryPassword);
        sheet.getRange(2, 1, 1, HEADERS.admins.length).setValues([[
          "admin",
          "",
          passwordRecord.salt,
          passwordRecord.hash,
          "admin",
          "",
        ]]);
        sheet.getRange(2, 1).setNote("Temporary admin password: " + temporaryPassword + ". Change it after first login.");
      }
    } else {
      // Only ensure headers if sheet exists, do not clear data
      ensureHeaders(name, HEADERS[key]);
    }
  });
}

function doGet(event) {
  const action = event.parameter.action || "bootstrap";

  if (action === "publicBootstrap") {
    return jsonResponse({
      shops: readPublicShops(),
    });
  }

  if (action === "bootstrap") {
    const session = validateSession(event.parameter.token, ["admin", "shopAdmin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }

    const includeArchive = event.parameter.includeArchive === "true" || event.parameter.includeArchive === "1";
    const transactions = readTransactions(includeArchive).filter((transaction) => canReadShop(session, transaction.shopId));
    return jsonResponse({
      shops: readShops().filter((shop) => canReadShop(session, shop.id)),
      transactions: transactions,
      fraudSignals: normalizeLookup(session.role) === "admin" ? readFraudSignals() : readFraudSignals().filter((signal) => canReadShop(session, signal.shopId)),
    });
  }

  return jsonResponse({ ok: false, reason: "Unknown action." });
}

function doPost(event) {
  const body = JSON.parse(event.postData.contents || "{}");

  if (body.action === "bootstrap") {
    const session = validateSession(body.token, ["admin", "shopAdmin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }

    const includeArchive = body.includeArchive === true || body.includeArchive === "true" || body.includeArchive === "1";
    const transactions = readTransactions(includeArchive).filter((transaction) => canReadShop(session, transaction.shopId));
    return jsonResponse({
      shops: readShops().filter((shop) => canReadShop(session, shop.id)),
      transactions: transactions,
      fraudSignals: normalizeLookup(session.role) === "admin" ? readFraudSignals() : readFraudSignals().filter((signal) => canReadShop(session, signal.shopId)),
    });
  }

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
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(addShop(body.shop));
  }

  if (body.action === "deleteShop") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(deleteShop(body.shopId));
  }

  if (body.action === "archiveOldTransactions") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(archiveOldTransactions());
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
    passwordSalt: String(row.passwordSalt || ""),
    passwordHash: String(row.passwordHash || ""),
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
    const session = createSession(found);
    return { ok: true, isAdmin: normalizeLookup(found.role) === "admin", role: found.role, shopId: found.shopId, token: session.token };
  }
  return { ok: false, reason: "Invalid username or password." };
}

function findAdminByCredentials(username, password) {
  ensureHeaders(SHEETS.admins, HEADERS.admins);
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.admins);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const usernameIndex = headers.indexOf("username");
  const passwordIndex = headers.indexOf("password");
  const passwordSaltIndex = headers.indexOf("passwordSalt");
  const passwordHashIndex = headers.indexOf("passwordHash");
  const roleIndex = headers.indexOf("role");
  const shopIdIndex = headers.indexOf("shopId");
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (String(row[usernameIndex]) !== String(username)) {
      continue;
    }

    const passwordSalt = passwordSaltIndex === -1 ? "" : String(row[passwordSaltIndex] || "");
    const passwordHash = passwordHashIndex === -1 ? "" : String(row[passwordHashIndex] || "");
    const legacyPassword = passwordIndex === -1 ? "" : String(row[passwordIndex] || "");
    const passwordMatches = passwordSalt && passwordHash
      ? verifyPassword(password, passwordSalt, passwordHash)
      : legacyPassword === String(password);

    if (!passwordMatches) {
      continue;
    }

    if (!passwordSalt || !passwordHash || legacyPassword) {
      migrateAdminPassword(sheet, headers, index + 2, password);
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

function createSession(admin) {
  ensureHeaders(SHEETS.sessions, HEADERS.sessions);
  clearExpiredSessions();

  const token = Utilities.getUuid() + "-" + Utilities.getUuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  appendObject(SHEETS.sessions, HEADERS.sessions, {
    token: token,
    username: admin.username,
    role: admin.role,
    shopId: admin.shopId || "",
    expiresAt: expiresAt,
    createdAt: now.toISOString(),
  });

  return { token: token, expiresAt: expiresAt };
}

function validateSession(token, allowedRoles) {
  if (!token) {
    return { ok: false, reason: "Login required." };
  }

  ensureHeaders(SHEETS.sessions, HEADERS.sessions);
  clearExpiredSessions();

  const rows = readObjects(SHEETS.sessions);
  const session = rows.find((row) => String(row.token) === String(token));
  if (!session) {
    return { ok: false, reason: "Session expired. Please log in again." };
  }

  const role = String(session.role || "").trim();
  const normalizedAllowedRoles = (allowedRoles || []).map((item) => normalizeLookup(item));
  if (normalizedAllowedRoles.length && normalizedAllowedRoles.indexOf(normalizeLookup(role)) === -1) {
    return { ok: false, reason: "You are not authorized for this action." };
  }

  return {
    ok: true,
    username: String(session.username || ""),
    role: role,
    shopId: String(session.shopId || ""),
  };
}

function canReadShop(session, shopId) {
  if (normalizeLookup(session.role) === "admin") {
    return true;
  }

  return normalizeLookup(session.shopId) === normalizeLookup(shopId);
}

function clearExpiredSessions() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sessions);
  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const expiresAtIndex = headers.indexOf("expiresAt");
  if (expiresAtIndex === -1) {
    return;
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const now = new Date();
  const rowsToDelete = [];
  rows.forEach((row, index) => {
    const expiresAt = new Date(row[expiresAtIndex]);
    if (!row[expiresAtIndex] || expiresAt <= now) {
      rowsToDelete.push(index + 2);
    }
  });

  deleteRowsByNumber(sheet, rowsToDelete);
}

function makeTemporaryPassword() {
  return "SM-" + Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

function makePasswordSalt() {
  return Utilities.getUuid() + "-" + Utilities.getUuid();
}

function hashPassword(password, salt) {
  const passwordSalt = salt || makePasswordSalt();
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    passwordSalt + ":" + String(password),
    Utilities.Charset.UTF_8
  );

  return {
    salt: passwordSalt,
    hash: digest.map((byte) => {
      const value = byte < 0 ? byte + 256 : byte;
      return ("0" + value.toString(16)).slice(-2);
    }).join(""),
  };
}

function verifyPassword(password, salt, expectedHash) {
  return hashPassword(password, salt).hash === String(expectedHash);
}

function migrateAdminPassword(sheet, headers, rowNumber, password) {
  ensureHeaders(SHEETS.admins, HEADERS.admins);
  const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const passwordIndex = updatedHeaders.indexOf("password");
  const passwordSaltIndex = updatedHeaders.indexOf("passwordSalt");
  const passwordHashIndex = updatedHeaders.indexOf("passwordHash");
  const passwordRecord = hashPassword(password);

  if (passwordIndex !== -1) {
    sheet.getRange(rowNumber, passwordIndex + 1).setValue("");
  }
  if (passwordSaltIndex !== -1) {
    sheet.getRange(rowNumber, passwordSaltIndex + 1).setValue(passwordRecord.salt);
  }
  if (passwordHashIndex !== -1) {
    sheet.getRange(rowNumber, passwordHashIndex + 1).setValue(passwordRecord.hash);
  }
}

function addShop(shopData) {
  const shopId = String(shopData.name).replace(/\s+/g, "").toLowerCase() + Math.floor(100 + Math.random() * 900);
  const defaultPassword = makeTemporaryPassword();
  const passwordRecord = hashPassword(defaultPassword);
  
  const newShop = {
    id: shopId,
    name: String(shopData.name),
    category: String(shopData.category || "General"),
    status: "active",
    maxReward: Number(shopData.maxReward || 100),
    costPerScan: Number(shopData.costPerScan || 10),
    rewardBands: JSON.stringify([
      { reward: 10, probability: 80 },
      { reward: 50, probability: 15, minBill: 100 },
      { reward: 100, probability: 5, minBill: 500 }
    ])
  };

  appendObject(SHEETS.shops, HEADERS.shops, newShop);

  const adminRow = {
    username: shopId,
    password: "",
    passwordSalt: passwordRecord.salt,
    passwordHash: passwordRecord.hash,
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
    return { ok: false, reason: "Purchase total must be at least 10." };
  }

  const rewardCalculation = calculateRewardDetails(shop, billAmount);

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
    reward: rewardCalculation.points,
    rewardRule: rewardCalculation.rule,
    rewardDetails: rewardCalculation.details,
    status: "approved",
    timestamp: new Date().toISOString(),
  };

  appendObject(SHEETS.transactions, HEADERS.transactions, transaction);
  return { ok: true, transaction };
}

function calculateReward(shop, billAmount) {
  return calculateRewardDetails(shop, billAmount).points;
}

function calculateRewardDetails(shop, billAmount) {
  const percentRule = findPercentRewardRule(shop, billAmount);
  if (percentRule) {
    const percent = randomBetween(percentRule.minPercent, percentRule.maxPercent);
    const rawPoints = (billAmount * percent) / 100;
    const roundedPoints = roundRewardAmount(rawPoints);
    return finalizePoints(roundedPoints, shop, billAmount, {
      rule: "percentage-slab",
      details: percent.toFixed(2) + "% of " + billAmount + ", rounded from " + rawPoints.toFixed(2) + " to " + roundedPoints,
    });
  }

  const eligibleBands = shop.rewardBands.filter((band) => {
    return (
      Number.isFinite(Number(band.reward)) &&
      Number.isFinite(Number(band.probability)) &&
      (!band.minBill || billAmount >= band.minBill)
    );
  });

  if (!eligibleBands.length) {
    return finalizePoints(MIN_POINTS, shop, billAmount, {
      rule: "minimum-fallback",
      details: "No percentage slab or fixed reward band matched.",
    });
  }

  const totalProbability = eligibleBands.reduce((sum, band) => sum + Number(band.probability), 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;

  for (let index = 0; index < eligibleBands.length; index += 1) {
    const band = eligibleBands[index];
    cursor += Number(band.probability);
    if (roll <= cursor) {
      return finalizePoints(Number(band.reward), shop, billAmount, {
        rule: "fixed-probability-band",
        details: Number(band.reward) + " point band selected from roll " + roll.toFixed(4) + " of " + totalProbability,
      });
    }
  }

  return finalizePoints(Number(eligibleBands[0] && eligibleBands[0].reward) || MIN_POINTS, shop, billAmount, {
    rule: "fixed-probability-fallback",
    details: "Probability cursor did not select a band; first eligible band used.",
  });
}

function getShopRewardRules(shop) {
  const lookup = normalizeLookup(shop.id + " " + shop.name);

  if (lookup.indexOf("sandeshagromachinery") !== -1) {
    return [
      { minBill: 0, maxBill: 2000, minPercent: 5, maxPercent: 7 },
      { minBill: 2000, maxBill: 10000, minPercent: 5, maxPercent: 5 },
      { minBill: 10000, maxBill: 50000, minPercent: 4, maxPercent: 4 },
      { minBill: 50000, minPercent: 2, maxPercent: 3 },
    ];
  }

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
    { minBill: 50, maxBill: 500, minPercent: 8, maxPercent: 15 },
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
  return Math.max(MIN_POINTS, Math.floor(Number(amount) / 10) * 10);
}

function clampPoints(amount, shop) {
  const shopLimit = Number.isFinite(Number(shop.maxReward)) ? Number(shop.maxReward) : MAX_POINTS;
  return Math.max(MIN_POINTS, Math.min(Number(amount), shopLimit, MAX_POINTS));
}

function finalizePoints(amount, shop, billAmount, source) {
  const points = clampPoints(amount, shop);
  const caps = ["shopMax=" + shop.maxReward, "globalMax=" + MAX_POINTS];
  let finalPoints = points;
  if (!Number.isFinite(Number(billAmount)) || Number(billAmount) < MIN_POINTS) {
    return {
      points: finalPoints,
      rule: source.rule,
      details: source.details + "; raw=" + amount + "; capped=" + finalPoints + "; caps=" + caps.join(", "),
    };
  }

  finalPoints = Math.min(points, Math.floor(Number(billAmount)));
  caps.push("purchaseTotal=" + Math.floor(Number(billAmount)));
  return {
    points: finalPoints,
    rule: source.rule,
    details: source.details + "; raw=" + amount + "; capped=" + finalPoints + "; caps=" + caps.join(", "),
  };
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

function readPublicShops() {
  return readShops()
    .filter((shop) => shop.status === "active")
    .map((shop) => ({
      id: shop.id,
      name: shop.name,
      category: shop.category,
      status: shop.status,
      maxReward: 0,
      costPerScan: 0,
      rewardBands: [],
    }));
}

function readTransactions(includeArchive) {
  return readTransactionObjects(includeArchive)
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
      rewardRule: String(row.rewardRule || ""),
      rewardDetails: String(row.rewardDetails || ""),
      status: String(row.status),
      timestamp: String(row.timestamp),
    }))
    .reverse();
}

function readTransactionObjects(includeArchive) {
  const currentTransactions = readObjects(SHEETS.transactions);
  if (!includeArchive) {
    return currentTransactions;
  }

  return readObjects(SHEETS.transactionArchive).concat(currentTransactions);
}

function readFraudSignals() {
  return readObjects(SHEETS.fraud).map((row) => ({
    mobile: String(row.mobile),
    shopId: String(row.shopId),
    attempts: Number(row.attempts),
    status: String(row.status),
  }));
}

function archiveOldTransactions() {
  const spreadsheet = SpreadsheetApp.getActive();
  const transactionsSheet = spreadsheet.getSheetByName(SHEETS.transactions);
  let archiveSheet = spreadsheet.getSheetByName(SHEETS.transactionArchive);

  if (!transactionsSheet) {
    return { ok: false, reason: "Transactions sheet not found." };
  }

  if (!archiveSheet) {
    archiveSheet = spreadsheet.insertSheet(SHEETS.transactionArchive);
    archiveSheet.getRange(1, 1, 1, HEADERS.transactionArchive.length).setValues([HEADERS.transactionArchive]);
    archiveSheet.setFrozenRows(1);
  } else {
    ensureHeaders(SHEETS.transactionArchive, HEADERS.transactionArchive);
  }

  ensureHeaders(SHEETS.transactions, HEADERS.transactions);

  const lastRow = transactionsSheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, archivedRows: 0 };
  }

  const headers = transactionsSheet.getRange(1, 1, 1, transactionsSheet.getLastColumn()).getValues()[0];
  const archiveHeaders = archiveSheet.getRange(1, 1, 1, archiveSheet.getLastColumn()).getValues()[0];
  const timestampIndex = headers.indexOf("timestamp");
  const values = transactionsSheet.getRange(2, 1, lastRow - 1, transactionsSheet.getLastColumn()).getValues();
  const today = dateKey(new Date());
  const rowsToArchive = [];
  const rowNumbersToDelete = [];

  values.forEach((row, index) => {
    const timestamp = row[timestampIndex];
    if (timestamp && dateKey(timestamp) < today) {
      rowsToArchive.push(archiveHeaders.map((header) => {
        const idx = headers.indexOf(header);
        return idx !== -1 ? row[idx] : "";
      }));
      rowNumbersToDelete.push(index + 2);
    }
  });

  if (!rowsToArchive.length) {
    return { ok: true, archivedRows: 0 };
  }

  archiveSheet
    .getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, archiveHeaders.length)
    .setValues(rowsToArchive);

  deleteRowsByNumber(transactionsSheet, rowNumbersToDelete);

  return { ok: true, archivedRows: rowsToArchive.length };
}

function deleteRowsByNumber(sheet, rowNumbers) {
  if (!rowNumbers.length) {
    return;
  }

  const sortedRows = rowNumbers.slice().sort((a, b) => b - a);
  let rangeEnd = sortedRows[0];
  let rangeStart = sortedRows[0];

  for (let index = 1; index < sortedRows.length; index += 1) {
    const rowNumber = sortedRows[index];
    if (rowNumber === rangeStart - 1) {
      rangeStart = rowNumber;
      continue;
    }

    sheet.deleteRows(rangeStart, rangeEnd - rangeStart + 1);
    rangeStart = rowNumber;
    rangeEnd = rowNumber;
  }

  sheet.deleteRows(rangeStart, rangeEnd - rangeStart + 1);
}

function readObjects(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) {
    return [];
  }

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
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = buildObjectRow(currentHeaders, object);
  sheet.appendRow(row);
}

function buildObjectRow(headers, object) {
  return headers.map((header) => object[header]);
}

function ensureHeaders(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActive();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const lastCol = sheet.getLastColumn();
  const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length)).getValues()[0] : [];
  const missingHeaders = headers.filter((header) => currentHeaders.indexOf(header) === -1);

  if (!missingHeaders.length) {
    return;
  }

  const nextColumn = lastCol + 1;
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
  
  const transactionRows = readTransactionRowsForSpreadsheet(spreadsheet);
  if (!transactionRows.rows.length) {
    summarySheet.appendRow(["Date", "Shop ID", "Total Purchase Value", "Total Points"]);
    return;
  }
  
  const headers = transactionRows.headers;
  const shopIdIdx = headers.indexOf("shopId");
  const billAmountIdx = headers.indexOf("billAmount");
  const rewardIdx = headers.indexOf("reward");
  const timestampIdx = headers.indexOf("timestamp");
  const statusIdx = headers.indexOf("status");
  
  const summaryData = {};
  
  for (let i = 0; i < transactionRows.rows.length; i++) {
    const row = transactionRows.rows[i];
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
        totalPoints: 0
      };
    }
    
    summaryData[key].totalBills += billAmount;
    summaryData[key].totalPoints += reward;
  }
  
  const outputRows = [["Date", "Shop ID", "Total Purchase Value", "Total Points"]];
  
  const sortedKeys = Object.keys(summaryData).sort((a, b) => b.localeCompare(a));
  
  sortedKeys.forEach(key => {
    const data = summaryData[key];
    outputRows.push([data.date, data.shopId, data.totalBills, data.totalPoints]);
  });
  
  summarySheet.getRange(1, 1, outputRows.length, 4).setValues(outputRows);
  summarySheet.setFrozenRows(1);
}

function readTransactionRowsForSpreadsheet(spreadsheet) {
  const headers = HEADERS.transactions;
  const rows = [];

  [SHEETS.transactionArchive, SHEETS.transactions].forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) {
      return;
    }

    const sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const sheetRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    sheetRows.forEach((row) => {
      rows.push(headers.map((header) => row[sheetHeaders.indexOf(header)]));
    });
  });

  return { headers: headers, rows: rows };
}

function setupDailyReportTrigger() {
  // Clear existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (
      trigger.getHandlerFunction() === 'emailDailyReport' ||
      trigger.getHandlerFunction() === 'archiveOldTransactions'
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Set up daily trigger (runs between 23:00 and midnight)
  ScriptApp.newTrigger('emailDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();

  // Move yesterday and older transactions after midnight so reward checks stay fast.
  ScriptApp.newTrigger('archiveOldTransactions')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();
}
