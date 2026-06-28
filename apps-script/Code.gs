const SHEETS = {
  shops: "shops",
  transactions: "transactions",
  transactionArchive: "transactions_archive",
  fraud: "fraud",
  admins: "admins",
  sessions: "sessions",
  gifts: "gifts",
  customers: "customers",
  leads: "leads",
};

const TRANSACTION_HISTORY_SHEETS = [
  "transactions_archive",
];

const MIN_POINTS = 10;
const MAX_POINTS = 1000;
const DEFAULT_MAX_BILL_AMOUNT = 100000;
const SHOP_MAX_BILL_AMOUNTS = {
  kalemedical: 10000,
  srujankidshouse119: 20000,
  srujankidshouse: 20000,
  ganeshelectrical947: 20000,
  ganeshelectrical: 20000,
  "गणेशइलेक्ट्रिकल330": 20000,
  "गणेशइलेक्ट्रिकल": 20000,
  sandeshagromachinery910: 90000,
  sandeshagromachinery: 90000,
  rahulagency363: 60000,
  rahulagency: 60000,
};

const HEADERS = {
  shops: ["id", "name", "category", "status", "maxReward", "maxBillAmount", "costPerScan", "rewardBands", "rewardType"],
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
    "rewardType",
    "giftItems",
    "email",
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
    "rewardType",
    "giftItems",
    "email",
  ],
  fraud: ["mobile", "shopId", "attempts", "status", "updatedAt"],
  admins: ["username", "password", "passwordSalt", "passwordHash", "role", "shopId"],
  sessions: ["token", "username", "role", "shopId", "expiresAt", "createdAt"],
  gifts: ["id", "name", "imageUrl"],
  customers: ["email", "mobile", "name", "address", "passwordSalt", "passwordHash", "updatedAt"],
  leads: ["id", "customerName", "mobile", "email", "address", "agreement", "ipAddress", "location", "latitude", "longitude", "timestamp"],
};

const SEED_SHOPS = [
  [
    "KaleMedical",
    "Kale Medical",
    "Medical Store",
    "active",
    600,
    10000,
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
    100000,
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
      gifts: readGifts(),
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
      shopPasswords: normalizeLookup(session.role) === "admin" ? readShopPasswords() : {},
      gifts: readGifts(),
      leads: normalizeLookup(session.role) === "admin" ? readLeads() : [],
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
      shopPasswords: normalizeLookup(session.role) === "admin" ? readShopPasswords() : {},
      gifts: readGifts(),
      leads: normalizeLookup(session.role) === "admin" ? readLeads() : [],
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
        Number(body.billAmount),
        body.email
      )
    );
  }

  if (body.action === "submitLead") {
    return jsonResponse(
      submitLead(
        body.customerName,
        body.address,
        body.mobile,
        body.email,
        body.agreement,
        body.ipAddress,
        body.location,
        body.latitude,
        body.longitude
      )
    );
  }

  if (body.action === "customerLogin") {
    return jsonResponse(customerLogin(body.identifier, body.password));
  }

  if (body.action === "customerSignUp") {
    return jsonResponse(customerSignUp(body.customer));
  }

  if (body.action === "lookupCustomer") {
    return jsonResponse(lookupCustomer(body.mobile));
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

  if (body.action === "updateShop") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(updateShop(body.shopId, body.shop));
  }

  if (body.action === "addGift") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(addGift(body.gift));
  }

  if (body.action === "updateGift") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(updateGift(body.giftId, body.gift));
  }

  if (body.action === "deleteGift") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(deleteGift(body.giftId));
  }

  if (body.action === "uploadGiftImage") {
    const session = validateSession(body.token, ["admin"]);
    if (!session.ok) {
      return jsonResponse(session);
    }
    return jsonResponse(uploadGiftImage(body.fileName, body.base64Data));
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

function resolveMaxBillAmount(shopId, shopName, configuredAmount) {
  const amount = Number(configuredAmount);
  if (Number.isFinite(amount) && amount > 0) {
    return amount;
  }

  const lookup = normalizeLookup(String(shopId || "") + " " + String(shopName || ""));
  for (const key in SHOP_MAX_BILL_AMOUNTS) {
    if (lookup.indexOf(key) !== -1) {
      return SHOP_MAX_BILL_AMOUNTS[key];
    }
  }

  return DEFAULT_MAX_BILL_AMOUNT;
}

function getMaxBillAmount(shop) {
  return resolveMaxBillAmount(shop.id, shop.name, shop.maxBillAmount);
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
    sheet.getRange(rowNumber, passwordIndex + 1).setValue(password);
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
    maxBillAmount: Number(shopData.maxBillAmount || DEFAULT_MAX_BILL_AMOUNT),
    costPerScan: Number(shopData.costPerScan || 10),
    rewardBands: JSON.stringify([
      { reward: 10, probability: 80 },
      { reward: 50, probability: 15, minBill: 100 },
      { reward: 100, probability: 5, minBill: 500 }
    ]),
    rewardType: String(shopData.rewardType || "mudra")
  };

  appendObject(SHEETS.shops, HEADERS.shops, newShop);

  const adminRow = {
    username: shopId,
    password: defaultPassword,
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

function updateShop(shopId, shopData) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.shops);
  ensureHeaders(SHEETS.shops, HEADERS.shops);

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const targetShopId = String(shopId);

  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idIndex]) === targetShopId) {
      headers.forEach((header, colIndex) => {
        if (header === "id") return; // ID is immutable
        if (shopData[header] !== undefined) {
          let val = shopData[header];
          if (header === "rewardBands" && typeof val !== "string") {
            val = JSON.stringify(val);
          }
          sheet.getRange(index + 1, colIndex + 1).setValue(val);
        }
      });
      const shop = readShops().find((item) => item.id === targetShopId);
      return { ok: true, shop: shop };
    }
  }

  return { ok: false, reason: "Shop not found." };
}

function readGifts() {
  ensureHeaders(SHEETS.gifts, HEADERS.gifts);
  return readObjects(SHEETS.gifts).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    imageUrl: String(row.imageUrl || ""),
  }));
}

function addGift(giftData) {
  ensureHeaders(SHEETS.gifts, HEADERS.gifts);
  const giftId = "GIFT-" + Math.floor(100000 + Math.random() * 900000);
  const newGift = {
    id: giftId,
    name: String(giftData.name || "").trim(),
    imageUrl: String(giftData.imageUrl || "").trim(),
  };
  appendObject(SHEETS.gifts, HEADERS.gifts, newGift);
  return { ok: true, gift: newGift };
}

function updateGift(giftId, giftData) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.gifts);
  ensureHeaders(SHEETS.gifts, HEADERS.gifts);

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const targetGiftId = String(giftId);

  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idIndex]) === targetGiftId) {
      headers.forEach((header, colIndex) => {
        if (header === "id") return; // ID is immutable
        if (giftData[header] !== undefined) {
          sheet.getRange(index + 1, colIndex + 1).setValue(String(giftData[header]).trim());
        }
      });
      const gift = readGifts().find((item) => item.id === targetGiftId);
      return { ok: true, gift: gift };
    }
  }

  return { ok: false, reason: "Gift not found." };
}

function deleteGift(giftId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.gifts);
  ensureHeaders(SHEETS.gifts, HEADERS.gifts);

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const targetGiftId = String(giftId);

  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idIndex]) === targetGiftId) {
      sheet.deleteRow(index + 1);
      return { ok: true, id: targetGiftId };
    }
  }

  return { ok: false, reason: "Gift not found." };
}

function uploadGiftImage(fileName, base64Data) {
  try {
    const folderName = "SmartMudraGifts";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const matches = String(base64Data).match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!matches) {
      return { ok: false, reason: "Invalid base64 image data format." };
    }
    const contentType = matches[1];
    const base64Body = matches[2];
    const bytes = Utilities.base64Decode(base64Body);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    
    // Set view sharing permission to anyone with link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const imageUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    
    return { ok: true, imageUrl: imageUrl };
  } catch (e) {
    return { ok: false, reason: "Drive Upload Error: " + e.toString() };
  }
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
  billAmount,
  email
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

  if (billAmount > getMaxBillAmount(shop)) {
    return { ok: false, reason: "Invalid amount." };
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
    rewardType: rewardCalculation.rewardType,
    giftItems: rewardCalculation.giftItems || "",
    status: "approved",
    timestamp: new Date().toISOString(),
    email: String(email || "").trim().toLowerCase(),
  };

  appendObject(SHEETS.transactions, HEADERS.transactions, transaction);
  saveCustomerProfile(email || "", mobile, customerName, address);
  return { ok: true, transaction };
}

function calculateReward(shop, billAmount) {
  return calculateRewardDetails(shop, billAmount).points;
}

function calculateRewardDetails(shop, billAmount) {
  const isGiftShop = shop.rewardType === "gift" || 
    (shop.rewardType !== "mudra" && normalizeLookup(shop.category).indexOf("gift") !== -1) ||
    (normalizeLookup(shop.category).indexOf("gift") !== -1 && shop.rewardBands && shop.rewardBands.some(function(band) { return band.giftItems; }));

  if (isGiftShop) {
    let matchingBand = null;
    if (shop.rewardBands && shop.rewardBands.length > 0) {
      for (let i = 0; i < shop.rewardBands.length; i++) {
        const band = shop.rewardBands[i];
        const minB = Number(band.minBill || 0);
        const maxB = band.maxBill ? Number(band.maxBill) : null;
        if (billAmount >= minB && (maxB === null || billAmount <= maxB)) {
          matchingBand = band;
          break;
        }
      }
    }
    if (matchingBand) {
      const giftItemsStr = String(matchingBand.giftItems || "");
      const items = giftItemsStr.split(",")
        .map(function(i) { return i.trim(); })
        .filter(Boolean);
      
      const selectedGift = items.length > 0
        ? items[Math.floor(Math.random() * items.length)]
        : "Gift Reward";

      return {
        points: 0,
        rule: "gift-reward-band",
        details: "Lucky Draw: " + selectedGift + " (from: " + giftItemsStr + ")",
        rewardType: "gift",
        giftItems: selectedGift,
      };
    } else {
      let minRequired = Infinity;
      if (shop.rewardBands && shop.rewardBands.length > 0) {
        for (let i = 0; i < shop.rewardBands.length; i++) {
          const minB = Number(shop.rewardBands[i].minBill || 0);
          if (minB < minRequired) {
            minRequired = minB;
          }
        }
      }
      const minText = Number.isFinite(minRequired) && minRequired > 0 ? "₹" + minRequired : "₹500";
      return {
        points: 0,
        rule: "gift-reward-fallback",
        details: "No gift eligible (Min purchase " + minText + ")",
        rewardType: "gift",
        giftItems: "",
      };
    }
  }

  const rules = getShopRewardRules(shop);
  let highestMaxBill = 0;
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    if (Number.isFinite(Number(r.maxBill)) && Number(r.maxBill) > highestMaxBill) {
      highestMaxBill = Number(r.maxBill);
    }
  }

  let effectiveBillAmount = billAmount;
  if (highestMaxBill > 0 && billAmount > highestMaxBill) {
    effectiveBillAmount = highestMaxBill;
  }

  const percentRule = findPercentRewardRule(shop, effectiveBillAmount);
  if (percentRule) {
    const percent = randomBetween(percentRule.minPercent, percentRule.maxPercent);
    const rawPoints = (effectiveBillAmount * percent) / 100;
    const roundedPoints = roundRewardAmount(rawPoints);
    return finalizePoints(roundedPoints, shop, billAmount, {
      rule: "percentage-slab",
      details: percent.toFixed(2) + "% of " + effectiveBillAmount + " (capped from " + billAmount + "), rounded from " + rawPoints.toFixed(2) + " to " + roundedPoints,
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

  // CUSTOM_RULES_START
  const CUSTOM_SHOP_RULES = {
    "srujankidshouse": [
      {
        "minBill": 100,
        "minPercent": 5,
        "maxPercent": 7,
        "probability": 90
      },
      {
        "minBill": 100,
        "minPercent": 7,
        "maxPercent": 8,
        "probability": 7
      },
      {
        "minBill": 100,
        "minPercent": 10,
        "maxPercent": 10,
        "probability": 3
      }
    ],
    "sandeshagro": [
      {
        "minBill": 100,
        "maxBill": 2000,
        "minPercent": 5,
        "maxPercent": 7
      },
      {
        "minBill": 2000,
        "maxBill": 10000,
        "minPercent": 5,
        "maxPercent": 5
      },
      {
        "minBill": 10000,
        "maxBill": 50000,
        "minPercent": 4,
        "maxPercent": 4
      },
      {
        "minBill": 50000,
        "minPercent": 2,
        "maxPercent": 3
      }
    ],
    "rahulagency": [
      {
        "minBill": 100,
        "maxBill": 1000,
        "minPercent": 10,
        "maxPercent": 15
      },
      {
        "minBill": 1000,
        "maxBill": 5000,
        "minPercent": 10,
        "maxPercent": 20
      },
      {
        "minBill": 5000,
        "maxBill": 10000,
        "minPercent": 10,
        "maxPercent": 15
      },
      {
        "minBill": 10000,
        "maxBill": 50000,
        "minPercent": 2,
        "maxPercent": 7
      }
    ]
  };
  // CUSTOM_RULES_END

  for (const key in CUSTOM_SHOP_RULES) {
    if (lookup.indexOf(key) !== -1) {
      return CUSTOM_SHOP_RULES[key];
    }
  }

  if (lookup.indexOf("test") !== -1 && shop.rewardBands && shop.rewardBands.length > 0) {
    return shop.rewardBands;
  }

  if (shop.rewardBands && shop.rewardBands.length > 0) {
    const hasPercentRules = shop.rewardBands.some(function(band) {
      return Number.isFinite(Number(band.minPercent)) || Number.isFinite(Number(band.maxPercent));
    });
    if (hasPercentRules) {
      return shop.rewardBands;
    }
  }

  return getDefaultRewardRules();
}

function getDefaultRewardRules() {
  return [
    { minBill: 100, maxBill: 500, minPercent: 6, maxPercent: 10 },
    { minBill: 500, maxBill: 1000, minPercent: 5, maxPercent: 10 },
    { minBill: 1000, maxBill: 2000, minPercent: 7, maxPercent: 12 },
    { minBill: 2000, maxBill: 3500, minPercent: 5, maxPercent: 10 },
    { minBill: 3500, maxBill: 6000, minPercent: 5, maxPercent: 8 },
    { minBill: 6000, maxBill: 10000, minPercent: 4, maxPercent: 6 },
  ];
}

function findPercentRewardRule(shop, billAmount) {
  const matchingRules = getShopRewardRules(shop).filter((rule) => {
    return (
      Number.isFinite(Number(rule.minPercent)) &&
      Number.isFinite(Number(rule.maxPercent)) &&
      billAmount >= Number(rule.minBill || 0) &&
      (!Number.isFinite(Number(rule.maxBill)) || billAmount <= Number(rule.maxBill))
    );
  });

  if (!matchingRules.length) return undefined;

  const hasProbability = matchingRules.some((r) => r.probability !== undefined && Number.isFinite(Number(r.probability)));
  if (!hasProbability) return matchingRules[0];

  const totalProbability = matchingRules.reduce((sum, r) => sum + (Number.isFinite(Number(r.probability)) ? Number(r.probability) : 0), 0);
  const roll = Math.random() * totalProbability;
  let cursor = 0;
  for (let i = 0; i < matchingRules.length; i++) {
    const rule = matchingRules[i];
    cursor += Number.isFinite(Number(rule.probability)) ? Number(rule.probability) : 0;
    if (roll <= cursor) return rule;
  }
  return matchingRules[0];
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
  let shopLimit = Number.isFinite(Number(shop.maxReward)) && Number(shop.maxReward) > 0 ? Number(shop.maxReward) : MAX_POINTS;

  // Custom high-value shops should default to their correct maxReward safety cap instead of 100 or falsy/0
  const lookup = normalizeLookup(shop.id);
  if (shopLimit === 100 || !shop.maxReward) {
    if (
      lookup.indexOf("srujankidshouse") !== -1 ||
      lookup.indexOf("sandeshagro") !== -1 ||
      lookup.indexOf("rahulagency") !== -1
    ) {
      shopLimit = 1000;
    } else if (lookup.indexOf("kalemedical") !== -1) {
      shopLimit = 600;
    }
  }

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
      rewardType: "mudra",
    };
  }

  finalPoints = Math.min(points, Math.floor(Number(billAmount)));
  caps.push("purchaseTotal=" + Math.floor(Number(billAmount)));
  return {
    points: finalPoints,
    rule: source.rule,
    details: source.details + "; raw=" + amount + "; capped=" + finalPoints + "; caps=" + caps.join(", "),
    rewardType: "mudra",
  };
}

function readShops() {
  return readObjects(SHEETS.shops).map((row) => {
    const id = String(row.id);
    let maxReward = Number(row.maxReward);
    const lookup = normalizeLookup(id);

    // If maxReward is falsy, empty, or 0, default to the universal max cap of 1000
    if (!maxReward) {
      maxReward = MAX_POINTS;
    }

    // Safety fallback for known custom high-value shops if they are still at default 100
    if (
      (lookup.indexOf("srujankidshouse") !== -1 ||
       lookup.indexOf("sandeshagro") !== -1 ||
       lookup.indexOf("rahulagency") !== -1 ||
       lookup.indexOf("kalemedical") !== -1) &&
      maxReward === 100
    ) {
      if (lookup.indexOf("kalemedical") !== -1) {
        maxReward = 600;
      } else {
        maxReward = 1000;
      }
    }

    return {
      id: id,
      name: String(row.name),
      category: String(row.category),
      status: String(row.status),
      maxReward: maxReward,
      maxBillAmount: resolveMaxBillAmount(id, String(row.name), row.maxBillAmount),
      costPerScan: Number(row.costPerScan),
      rewardBands: JSON.parse(row.rewardBands || "[]"),
      rewardType: (row.rewardType && String(row.rewardType).trim()) || "mudra",
    };
  });
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
      rewardType: shop.rewardType,
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
      rewardType: (row.rewardType && String(row.rewardType).trim()) || "mudra",
      giftItems: String(row.giftItems || ""),
      status: String(row.status),
      timestamp: String(row.timestamp),
      email: String(row.email || ""),
    }))
    .reverse();
}

function lookupCustomer(mobile) {
  const targetMobile = String(mobile || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(targetMobile)) {
    return { ok: false, reason: "Enter a valid 10 digit mobile number." };
  }

  const transactions = readTransactions(true).filter((transaction) => {
    const transactionMobileNorm = normalizeMobile(transaction.mobile);
    const targetMobileNorm = normalizeMobile(targetMobile);
    const status = normalizeLookup(transaction.status);
    return transactionMobileNorm === targetMobileNorm && (!status || status === "approved");
  });

  if (!transactions.length) {
    return { ok: true, found: false };
  }

  const latest = transactions[0];
  return {
    ok: true,
    found: true,
    customerName: latest.customerName,
    address: latest.address,
  };
}

function readTransactionObjects(includeArchive) {
  const currentTransactions = readObjects(SHEETS.transactions);
  if (!includeArchive) {
    return currentTransactions;
  }

  const archiveRows = TRANSACTION_HISTORY_SHEETS.reduce((rows, sheetName) => {
    return rows.concat(readObjects(sheetName));
  }, []);

  return archiveRows.concat(currentTransactions);
}

function readFraudSignals() {
  return readObjects(SHEETS.fraud).map((row) => ({
    mobile: String(row.mobile),
    shopId: String(row.shopId),
    attempts: Number(row.attempts),
    status: String(row.status),
  }));
}

function readShopPasswords() {
  const admins = readObjects(SHEETS.admins);
  const passwords = {};
  admins.forEach(row => {
    if (String(row.role) === "shopAdmin" && String(row.shopId)) {
      passwords[String(row.shopId)] = String(row.password);
    }
  });
  return passwords;
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

// ------------------------------------------------------------------------
// ONE-TIME HELPER FUNCTION TO RESET PASSWORD
// Select "updateSrujanPassword" in the Apps Script editor and click "Run"
// ------------------------------------------------------------------------
function updateSrujanPassword() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.admins);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const usernameIdx = headers.indexOf("username");
  const passwordIdx = headers.indexOf("password");
  const passwordSaltIdx = headers.indexOf("passwordSalt");
  const passwordHashIdx = headers.indexOf("passwordHash");
  
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][usernameIdx]) === "srujankidshouse") {
      const newPassword = "srujan123";
      const record = hashPassword(newPassword);
      sheet.getRange(i + 1, passwordIdx + 1).setValue(newPassword);
      sheet.getRange(i + 1, passwordSaltIdx + 1).setValue(record.salt);
      sheet.getRange(i + 1, passwordHashIdx + 1).setValue(record.hash);
      Logger.log("Successfully updated password for srujankidshouse to: " + newPassword);
      return;
    }
  }
  Logger.log("Could not find shop 'srujankidshouse' in the admins sheet.");
}

function saveCustomerProfile(email, mobile, name, address, password) {
  const sheet = getSheetByNameCaseInsensitive(SHEETS.customers);
  ensureHeaders(SHEETS.customers, HEADERS.customers);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const emailIdx = headers.indexOf("email");
  const mobileIdx = headers.indexOf("mobile");
  const nameIdx = headers.indexOf("name");
  const addressIdx = headers.indexOf("address");
  const passwordSaltIdx = headers.indexOf("passwordSalt");
  const passwordHashIdx = headers.indexOf("passwordHash");
  const updatedAtIdx = headers.indexOf("updatedAt");

  const targetEmail = String(email || "").trim().toLowerCase();
  const targetMobile = String(mobile || "").replace(/\D/g, "");

  let foundRow = -1;

  const targetMobileNorm = normalizeMobile(targetMobile);
  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][emailIdx]).trim().toLowerCase();
    const rowMobileNorm = normalizeMobile(values[i][mobileIdx]);
    if ((targetEmail && rowEmail === targetEmail) || (targetMobileNorm && rowMobileNorm === targetMobileNorm)) {
      foundRow = i + 1;
      break;
    }
  }

  const timestamp = new Date().toISOString();
  let salt = "";
  let hash = "";
  if (password) {
    const record = hashPassword(password);
    salt = record.salt;
    hash = record.hash;
  }

  if (foundRow !== -1) {
    if (name) sheet.getRange(foundRow, nameIdx + 1).setValue(String(name).trim());
    if (mobile) sheet.getRange(foundRow, mobileIdx + 1).setValue(targetMobile);
    if (email) sheet.getRange(foundRow, emailIdx + 1).setValue(targetEmail);
    if (address) sheet.getRange(foundRow, addressIdx + 1).setValue(String(address).trim());
    if (password) {
      sheet.getRange(foundRow, passwordSaltIdx + 1).setValue(salt);
      sheet.getRange(foundRow, passwordHashIdx + 1).setValue(hash);
    }
    sheet.getRange(foundRow, updatedAtIdx + 1).setValue(timestamp);
  } else {
    appendObject(SHEETS.customers, HEADERS.customers, {
      email: targetEmail,
      mobile: targetMobile,
      name: String(name || "").trim(),
      address: String(address || "").trim(),
      passwordSalt: salt,
      passwordHash: hash,
      updatedAt: timestamp
    });
  }
}

function customerLogin(identifier, password) {
  ensureHeaders(SHEETS.customers, HEADERS.customers);
  const sheet = getSheetByNameCaseInsensitive(SHEETS.customers);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return { ok: false, reason: "Customer not found. Please register." };
  }

  const headers = values[0];
  const emailIdx = headers.indexOf("email");
  const mobileIdx = headers.indexOf("mobile");
  const nameIdx = headers.indexOf("name");
  const addressIdx = headers.indexOf("address");
  const passwordSaltIdx = headers.indexOf("passwordSalt");
  const passwordHashIdx = headers.indexOf("passwordHash");

  const target = String(identifier || "").trim().toLowerCase();
  const targetCleanNorm = normalizeMobile(target.replace(/\D/g, ""));

  let foundCustomer = null;

  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][emailIdx]).trim().toLowerCase();
    const rowMobile = String(values[i][mobileIdx]).replace(/\D/g, "");
    const rowMobileNorm = normalizeMobile(rowMobile);
    if ((target && rowEmail === target) || (targetCleanNorm && rowMobileNorm === targetCleanNorm)) {
      const salt = String(values[i][passwordSaltIdx] || "");
      const hash = String(values[i][passwordHashIdx] || "");
      if (!password || verifyPassword(password, salt, hash)) {
        foundCustomer = {
          email: rowEmail,
          mobile: rowMobile,
          name: String(values[i][nameIdx]),
          address: String(values[i][addressIdx])
        };
        break;
      } else {
        return { ok: false, reason: "Invalid password." };
      }
    }
  }

  if (!foundCustomer) {
    return { ok: false, reason: "Customer profile not found." };
  }

  // Find all transactions for this customer
  const transactions = readTransactions(true).filter((tx) => {
    const txEmail = String(tx.email || "").trim().toLowerCase();
    const txMobileNorm = normalizeMobile(tx.mobile);
    const custMobileNorm = normalizeMobile(foundCustomer.mobile);
    const status = normalizeLookup(tx.status);
    return (
      (!status || status === "approved") &&
      ((foundCustomer.email && txEmail === foundCustomer.email) ||
       (custMobileNorm && txMobileNorm === custMobileNorm))
    );
  });

  return { ok: true, customer: foundCustomer, transactions: transactions };
}

function customerSignUp(customerData) {
  ensureHeaders(SHEETS.customers, HEADERS.customers);
  const sheet = getSheetByNameCaseInsensitive(SHEETS.customers);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const emailIdx = headers.indexOf("email");
  const mobileIdx = headers.indexOf("mobile");

  const email = String(customerData.email || "").trim().toLowerCase();
  const mobile = String(customerData.mobile || "").replace(/\D/g, "");

  if (!email && !mobile) {
    return { ok: false, reason: "Email or mobile number is required." };
  }

  const mobileNorm = normalizeMobile(mobile);
  for (let i = 1; i < values.length; i++) {
    const rowEmail = String(values[i][emailIdx]).trim().toLowerCase();
    const rowMobileNorm = normalizeMobile(values[i][mobileIdx]);
    if ((email && rowEmail === email) || (mobileNorm && rowMobileNorm === mobileNorm)) {
      return { ok: false, reason: "Account already exists with this email or mobile." };
    }
  }

  saveCustomerProfile(email, mobile, customerData.name, customerData.address, customerData.password);
  return { ok: true, customer: { email, mobile, name: customerData.name, address: customerData.address } };
}

function getSheetByNameCaseInsensitive(sheetName, spreadsheet) {
  const ss = spreadsheet || SpreadsheetApp.getActive();
  const sheets = ss.getSheets();
  const targetLower = sheetName.toLowerCase();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase() === targetLower) {
      return sheets[i];
    }
  }
  return null;
}

function normalizeMobile(mobile) {
  const clean = String(mobile || "").replace(/\D/g, "");
  return clean.length >= 10 ? clean.slice(-10) : clean;
}

function readLeads() {
  ensureHeaders(SHEETS.leads, HEADERS.leads);
  return readObjects(SHEETS.leads).map((row) => ({
    id: String(row.id),
    customerName: String(row.customerName),
    mobile: String(row.mobile),
    email: String(row.email || ""),
    address: String(row.address),
    agreement: String(row.agreement),
    ipAddress: String(row.ipAddress || "Unknown"),
    location: String(row.location || "Unknown"),
    latitude: row.latitude === "" || row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === "" || row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    timestamp: String(row.timestamp),
  }));
}

function submitLead(
  customerName,
  address,
  mobile,
  email,
  agreement,
  ipAddress,
  location,
  latitude,
  longitude
) {
  if (!String(customerName || "").trim()) {
    return { ok: false, reason: "Enter customer name." };
  }

  if (!/^[6-9]\d{9}$/.test(String(mobile))) {
    return { ok: false, reason: "Enter a valid 10 digit mobile number." };
  }

  if (!String(address || "").trim()) {
    return { ok: false, reason: "Enter customer address." };
  }

  if (!agreement || String(agreement).toLowerCase() !== "yes") {
    return { ok: false, reason: "You must agree to participate in this membership contest." };
  }

  const lead = {
    id: "LEAD-" + Math.floor(100000 + Math.random() * 900000),
    customerName: String(customerName).trim(),
    mobile: String(mobile),
    email: String(email || "").trim().toLowerCase(),
    address: String(address).trim(),
    agreement: String(agreement),
    ipAddress: String(ipAddress || "Unknown"),
    location: String(location || "Unknown"),
    latitude: latitude === null || latitude === undefined ? "" : Number(latitude),
    longitude: longitude === null || longitude === undefined ? "" : Number(longitude),
    timestamp: new Date().toISOString()
  };

  ensureHeaders(SHEETS.leads, HEADERS.leads);
  appendObject(SHEETS.leads, HEADERS.leads, lead);

  saveCustomerProfile(email || "", mobile, customerName, address);

  return { ok: true, lead: lead };
}
