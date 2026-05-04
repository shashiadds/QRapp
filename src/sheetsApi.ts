import type { AppData, RewardResult, VisitorContext } from "./types";

const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

export const isSheetsConfigured = Boolean(scriptUrl);

async function request<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  if (!scriptUrl) {
    throw new Error("Google Apps Script URL is not configured.");
  }

  const url = new URL(scriptUrl);
  url.searchParams.set("action", action);

  const response = await fetch(url, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
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

export function loadSheetsData() {
  return request<AppData>("bootstrap");
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

export function adminLogin(password: string, username: string) {
  return request<{ ok: boolean; isAdmin: boolean }>("adminLogin", {
    username,
    password,
  });
}
