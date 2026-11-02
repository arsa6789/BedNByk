// Map helpers: tiles, OpenStreetMap geocoding (Nominatim) and pure functions that turn search results into map markers.
// Stack: Leaflet + OpenStreetMap tiles + Nominatim. All free, no API key, but with usage rules:
//   - Tiles:     https://operations.osmfoundation.org/policies/tiles/   (fine for a small app, keep the attribution)
//   - Nominatim: https://operations.osmfoundation.org/policies/nominatim/ (max 1 request/second, no autocomplete-as-you-type)

export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const NOMINATIM = "https://nominatim.openstreetmap.org";
const GEO_CACHE_KEY = "stayfinder:geo:v1";
const GEO_CACHE_MAX = 200;
const MIN_GAP_MS = 1100; // a little over 1 second between Nominatim calls

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
export const validLatLng = (lat, lng) => isNum(lat) && isNum(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

// ---------- throttled Nominatim access ----------
let chain = Promise.resolve();
let lastCallAt = 0;
function throttled(task) {
  const run = chain.then(async () => {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return task();
  });
  chain = run.catch(() => {});
  return run;
}

async function nominatim(path, params, signal) {
  const qs = new URLSearchParams({ format: "jsonv2", addressdetails: "1", ...params });
  const res = await fetch(`${NOMINATIM}${path}?${qs}`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(res.status === 429 ? "The map search is busy. Try again in a moment." : "The map search is unavailable right now.");
  return res.json();
}

// ---------- small persistent cache (text -> place) so each address is looked up once ----------
const memory = new Map();
function readCache() {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}") || {}; } catch { return {}; }
}
function writeCache(key, value) {
  memory.set(key, value);
  try {
    const all = readCache();
    all[key] = value;
    const keys = Object.keys(all);
    if (keys.length > GEO_CACHE_MAX) keys.slice(0, keys.length - GEO_CACHE_MAX).forEach((k) => delete all[k]);
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(all));
  } catch {}
}
function cached(key) {
  if (memory.has(key)) return memory.get(key);
  const hit = readCache()[key];
  if (hit !== undefined) memory.set(key, hit);
  return hit;
}

// ---------- Nominatim result -> our place shape ----------
// place = { lat, lng, label, city, country }
export function placeFromResult(r) {
  const lat = Number(r?.lat), lng = Number(r?.lon);
  if (!validLatLng(lat, lng)) return null;
  const a = r.address || {};
  const city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state || "";
  const country = a.country || "";
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const name = r.name || a.aeroway || a.tourism || a.amenity || a.railway || "";
  const isAirport = r.category === "aeroway" || r.type === "aerodrome" || a.aeroway;
  let label = "";
  if (isAirport && name) label = name; // airport names are what rental sites know best
  else if (name && name !== city) label = [name, city].filter(Boolean).join(", ");
  else if (street) label = [street, city].filter(Boolean).join(", ");
  else label = String(r.display_name || "").split(",").slice(0, 2).map((s) => s.trim()).filter(Boolean).join(", ");
  if (!label) label = city || country || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return { lat, lng, label, city, country };
}

export async function searchPlaces(query, signal) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const rows = await throttled(() => nominatim("/search", { q, limit: "6" }, signal));
  return (Array.isArray(rows) ? rows : []).map(placeFromResult).filter(Boolean);
}

export async function reversePlace(lat, lng, signal) {
  if (!validLatLng(lat, lng)) return null;
  const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cached(key);
  if (hit) return hit;
  const row = await throttled(() => nominatim("/reverse", { lat: String(lat), lon: String(lng), zoom: "17" }, signal));
  const place = row && !row.error ? placeFromResult(row) : null;
  // The pin the user placed is the truth; Nominatim only supplies a name for it.
  const out = place ? { ...place, lat, lng } : null;
  if (out) writeCache(key, out);
  return out;
}

// Look up a free-text address once (cached, including misses). Returns a place or null.
export async function geocodeText(text, signal) {
  const q = String(text || "").trim();
  if (q.length < 3) return null;
  const key = `q:${q.toLowerCase()}`;
  const hit = cached(key);
  if (hit !== undefined) return hit;
  const rows = await throttled(() => nominatim("/search", { q, limit: "1" }, signal));
  const place = Array.isArray(rows) && rows[0] ? placeFromResult(rows[0]) : null;
  writeCache(key, place);
  return place;
}

// ---------- coordinates the search APIs already give us ----------
// Rentalcars' search_url holds "coordinates=lat,lng" (pick-up) and "dropCoordinates=lat,lng" (drop-off).
export function coordsFromSearchUrl(url, key) {
  try {
    const raw = new URL(url).searchParams.get(key);
    if (!raw) return null;
    const [lat, lng] = raw.split(",").map(Number);
    return validLatLng(lat, lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

// ---------- marker builders ----------
// marker = { id, lat, lng, kind, label, title, subtitle, items, cta? }
//   kind: "hotel" | "bike" | "pickup" | "dropoff"; label is the text on the pin; items are unified feed items.

export function tripMarkers(meta, form, items, onShowList) {
  const url = meta?.search_url;
  const pick = coordsFromSearchUrl(url, "coordinates") || (validLatLng(form?.pickupPin?.lat, form?.pickupPin?.lng) ? form.pickupPin : null);
  const dropCoords = coordsFromSearchUrl(url, "dropCoordinates");
  const drop = dropCoords || (form?.differentDropoff && validLatLng(form?.dropoffPin?.lat, form?.dropoffPin?.lng) ? form.dropoffPin : null);
  const cheapest = items.reduce((m, it) => (it.price != null && (m == null || it.price < m.price) ? it : m), null);
  const out = [];
  const cta = { label: `Show ${items.length} car${items.length === 1 ? "" : "s"}`, onClick: onShowList };
  if (pick) {
    out.push({
      id: "pickup", lat: pick.lat, lng: pick.lng, kind: "pickup", label: "A",
      title: "Pick-up", subtitle: meta?.pickup_location || form?.pickup || "",
      note: cheapest ? `${items.length} cars loaded · from ${cheapest.priceText} / day` : "",
      items: [], cta: items.length ? cta : null,
    });
  }
  const sameAsPick = drop && pick && Math.abs(drop.lat - pick.lat) < 1e-4 && Math.abs(drop.lng - pick.lng) < 1e-4;
  if (drop && !sameAsPick) {
    out.push({
      id: "dropoff", lat: drop.lat, lng: drop.lng, kind: "dropoff", label: "B",
      title: "Drop-off", subtitle: meta?.dropoff_location || form?.dropoff || "",
      note: "Return the car here.", items: [], cta: null,
    });
  }
  return out;
}

export function hotelMarkers(items) {
  return items
    .filter((it) => validLatLng(it.lat, it.lng))
    .map((it) => ({
      id: it.key, lat: it.lat, lng: it.lng, kind: "hotel", label: it.priceShort || it.title.slice(0, 10),
      title: it.title, subtitle: it.subtitle, items: [it],
    }));
}

// Bikes only have a text address, so they are grouped by address and placed from the geocode cache.
export function bikeMarkers(items, places) {
  const groups = new Map();
  for (const it of items) {
    const addr = it.address;
    const place = addr && places[addr];
    if (!place) continue;
    if (!groups.has(addr)) groups.set(addr, { place, items: [] });
    groups.get(addr).items.push(it);
  }
  return [...groups.entries()].map(([addr, { place, items: list }]) => {
    const cheapest = list.reduce((m, it) => (it.price != null && (m == null || it.price < m.price) ? it : m), list[0]);
    return {
      id: `bike:${addr}`, lat: place.lat, lng: place.lng, kind: "bike",
      label: cheapest?.priceShort || String(list.length),
      title: list[0].subtitle?.split(" · ")[1] || "Rental shop", subtitle: addr, items: list.slice(0, 4),
    };
  });
}
