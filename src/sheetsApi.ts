import type { AppData, PublicAppData, RewardResult, Shop, Session, VisitorContext } from "./types";

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
