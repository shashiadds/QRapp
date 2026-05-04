import type { VisitorContext } from "./types";

type IpWhoIsResponse = {
  success?: boolean;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

const fallbackContext: VisitorContext = {
  ipAddress: "Unknown",
  location: "Unknown",
  latitude: null,
  longitude: null,
};

export async function loadVisitorContext(): Promise<VisitorContext> {
  try {
    const response = await fetch("https://ipwho.is/");

    if (!response.ok) {
      return fallbackContext;
    }

    const data = (await response.json()) as IpWhoIsResponse;

    if (data.success === false) {
      return fallbackContext;
    }

    const locationParts = [data.city, data.region, data.country].filter(Boolean);

    return {
      ipAddress: data.ip || fallbackContext.ipAddress,
      location: locationParts.length ? locationParts.join(", ") : fallbackContext.location,
      latitude: Number.isFinite(data.latitude) ? Number(data.latitude) : null,
      longitude: Number.isFinite(data.longitude) ? Number(data.longitude) : null,
    };
  } catch {
    return fallbackContext;
  }
}
