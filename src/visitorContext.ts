import type { VisitorContext } from "./types";

type LoadVisitorContextOptions = {
  includeDeviceLocation?: boolean;
};

type IpWhoIsResponse = {
  success?: boolean;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  country_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
};

const fallbackContext: VisitorContext = {
  ipAddress: "Unknown",
  location: "Unknown",
  latitude: null,
  longitude: null,
};

export async function loadVisitorContext(
  options: LoadVisitorContextOptions = {}
): Promise<VisitorContext> {
  const urls = ["https://ipwho.is/", "https://ipapi.co/json/"];
  let visitorContext = fallbackContext;

  for (const url of urls) {
    const context = await fetchVisitorContext(url);
    if (context) {
      visitorContext = context;
      break;
    }
  }

  if (!options.includeDeviceLocation) {
    return visitorContext;
  }

  const deviceCoordinates = await loadDeviceCoordinates();
  if (!deviceCoordinates) {
    return visitorContext;
  }

  return {
    ...visitorContext,
    latitude: deviceCoordinates.latitude,
    longitude: deviceCoordinates.longitude,
  };
}

async function fetchVisitorContext(url: string): Promise<VisitorContext | null> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as IpWhoIsResponse;

    if (data.success === false) {
      return null;
    }

    const locationParts = [data.city, data.region, data.country || data.country_name].filter(Boolean);
    const latitude = toCoordinate(data.latitude ?? data.lat);
    const longitude = toCoordinate(data.longitude ?? data.lon);

    return {
      ipAddress: data.ip || fallbackContext.ipAddress,
      location: locationParts.length ? locationParts.join(", ") : fallbackContext.location,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

function toCoordinate(value: number | string | undefined): number | null {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function loadDeviceCoordinates(): Promise<Pick<VisitorContext, "latitude" | "longitude"> | null> {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 5000,
      }
    );
  });
}
