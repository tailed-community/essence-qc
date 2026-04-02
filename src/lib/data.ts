import pako from "pako";
import type { StationFeature } from "@/types";

const DATA_URL = "https://regieessencequebec.ca/stations.geojson.gz";
const CORS_PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url=",
];

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function decompressAndParse(
  response: Response
): Promise<StationFeature[]> {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let jsonStr: string;
  try {
    jsonStr = pako.inflate(bytes, { to: "string" });
  } catch {
    const decoder = new TextDecoder("utf-8");
    jsonStr = decoder.decode(bytes);
  }

  const geojson = JSON.parse(jsonStr);
  return processFeatures(geojson);
}

function processFeatures(geojson: {
  features?: StationFeature[];
}): StationFeature[] {
  if (!geojson?.features) {
    throw new Error("Format de données invalide");
  }

  return geojson.features
    .filter((f) => {
      if (f.properties?.Status !== "En opération") return false;
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return false;
      return true;
    })
    .map((f) => ({
      ...f,
      _coords: {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      },
    }));
}

export async function fetchStations(
  onProgress?: (msg: string) => void
): Promise<StationFeature[]> {
  let lastError: Error | undefined;

  // Try direct fetch
  try {
    onProgress?.("Connexion au serveur...");
    const resp = await fetchWithTimeout(DATA_URL, 15000);
    if (resp.ok) {
      onProgress?.("Décompression des données...");
      return await decompressAndParse(resp);
    }
  } catch (e) {
    lastError = e as Error;
  }

  // Try CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      onProgress?.("Tentative via proxy...");
      const url = proxy + encodeURIComponent(DATA_URL);
      const resp = await fetchWithTimeout(url, 20000);
      if (resp.ok) {
        onProgress?.("Décompression des données...");
        return await decompressAndParse(resp);
      }
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw new Error(
    lastError?.message ||
      "Impossible de charger les données. Vérifiez votre connexion internet."
  );
}
