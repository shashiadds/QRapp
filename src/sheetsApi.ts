import type { AppData, PublicAppData, RewardResult, Shop, Session, VisitorContext, GiftItem } from "./types";

const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const isSheetsConfigured = Boolean(scriptUrl);

async function request<T>(
  action: string,
  payload?: Record<string, unknown>,
  query?: Record<string, string>
): Promise<T> {
  if (!scriptUrl) {
    throw new Error("Google Apps Script URL is not configured.");
  }

  const url = new URL(scriptUrl);
  url.searchParams.set("action", action);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: payload ? JSON.stringify({ action, ...payload }) : undefined,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.ok === false) {
    throw new Error(result.reason ?? "Google Sheets request failed.");
  }

  return result as T;
}

export function loadPublicData() {
  return request<PublicAppData>("publicBootstrap");
}

export function loadSheetsData(options: { includeArchive?: boolean; token?: string } = {}) {
  return request<AppData>(
    "bootstrap",
    {
      includeArchive: Boolean(options.includeArchive),
      token: options.token,
    }
  );
}

export function submitSheetsReward(
  shopId: string,
  customerName: string,
  address: string,
  mobile: string,
  billAmount: number,
  visitorContext: VisitorContext
) {
  return request<RewardResult>("submitReward", {
    shopId,
    customerName,
    address,
    ipAddress: visitorContext.ipAddress,
    location: visitorContext.location,
    latitude: visitorContext.latitude,
    longitude: visitorContext.longitude,
    mobile,
    billAmount,
  });
}

export function submitSheetsLead(
  customerName: string,
  address: string,
  mobile: string,
  email: string,
  agreement: boolean,
  visitorContext: VisitorContext,
  shopId?: string
) {
  return request<{ ok: boolean; lead: any }>("submitLead", {
    customerName,
    address,
    mobile,
    email,
    agreement: agreement ? "Yes" : "No",
    ipAddress: visitorContext.ipAddress,
    location: visitorContext.location,
    latitude: visitorContext.latitude,
    longitude: visitorContext.longitude,
    shopId: shopId || "",
  });
}

export function lookupSheetsCustomer(mobile: string) {
  return request<{ ok: boolean; found: boolean; customerName?: string; address?: string }>("lookupCustomer", {
    mobile,
  });
}

export function authLogin(password: string, username: string) {
  return request<{ ok: boolean; role?: string; shopId?: string; isAdmin?: boolean; token?: string }>("adminLogin", {
    username,
    password,
  });
}

export function addSheetsShop(shop: Partial<Shop>, session: Session | null) {
  return request<{ ok: boolean; shop: Shop; credentials: { username: string; password: string } }>("addShop", {
    shop,
    token: session?.token,
  });
}

export function deleteSheetsShop(shopId: string, session: Session | null) {
  return request<{ ok: boolean; shop: Shop }>("deleteShop", {
    shopId,
    token: session?.token,
  });
}

export function updateSheetsShop(shopId: string, shop: Partial<Shop>, session: Session | null) {
  return request<{ ok: boolean; shop: Shop }>("updateShop", {
    shopId,
    shop,
    token: session?.token,
  });
}

export function addSheetsGift(gift: Partial<GiftItem>, session: Session | null) {
  return request<{ ok: boolean; gift: GiftItem }>("addGift", {
    gift,
    token: session?.token,
  });
}

export function deleteSheetsGift(giftId: string, session: Session | null) {
  return request<{ ok: boolean; id: string }>("deleteGift", {
    giftId,
    token: session?.token,
  });
}

export function updateSheetsGift(giftId: string, gift: Partial<GiftItem>, session: Session | null) {
  return request<{ ok: boolean; gift: GiftItem }>("updateGift", {
    giftId,
    gift,
    token: session?.token,
  });
}

export function uploadSheetsGiftImage(fileName: string, base64Data: string, session: Session | null) {
  return request<{ ok: boolean; imageUrl: string }>("uploadGiftImage", {
    fileName,
    base64Data,
    token: session?.token,
  });
}
