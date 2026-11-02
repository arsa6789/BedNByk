"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FEED_LIMIT, feedDates, feedPayload } from "./feed";

// Empty on Vercel (same origin). For the Capacitor app it is your deployed Vercel URL.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const TTL_MS = 30 * 60_000;          // a cached section is reused for 30 minutes (each live search costs credits)
const PRUNE_MS = 24 * 60 * 60_000;   // older cache entries are deleted
const PREFIX = "stayfinder:feed:v1:";
const TIMEOUT_MS = 70_000;

const ROUTES = { hotels: "/api/search", cars: "/api/cars/search", bikes: "/api/bikes/search" };
const ERRORS = {
  rate_limited: "Too many requests right now. Try again in a minute.",
  timeout: "This is taking too long. Try again.",
  server_not_configured: "The server has no NOTTE_API_KEY set yet.",
  bad_api_key: "The server’s Notte API key was rejected.",
};
const IDLE = { status: "idle", items: [], meta: null, error: "" };

function readCache(key) {
  try {
    const hit = JSON.parse(localStorage.getItem(key) || "null");
    if (hit && Date.now() - hit.ts < TTL_MS && Array.isArray(hit.items) && hit.items.length) return hit;
  } catch {}
  return null;
}
function writeCache(key, value) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      try { if (Date.now() - JSON.parse(localStorage.getItem(k)).ts > PRUNE_MS) localStorage.removeItem(k); } catch { localStorage.removeItem(k); }
    }
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), ...value }));
  } catch {}
}

// Attach the trip to cars and bikes so saving them or opening bike details works the same as from search results.
function withTrip(kind, list, meta, city) {
  const { start, end } = feedDates();
  if (kind === "cars") {
    const trip = { pickup_location: meta?.pickup_location || city.car, dropoff_location: meta?.dropoff_location || "", pickup_date: start, dropoff_date: end, rental_days: meta?.rental_days ?? 3 };
    return list.map((v) => ({ ...v, trip }));
  }
  if (kind === "bikes") {
    const trip = { city: meta?.resolved_location || city.bike, pickup_date: start, return_date: end, pickup_time: "10:00", return_time: "10:00", rental_days: meta?.rental_days ?? 3 };
    return list.map((b) => ({ ...b, trip }));
  }
  return list;
}

async function fetchSection(kind, city) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${ROUTES[kind]}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(feedPayload(kind, city)), signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    if (!body || typeof body !== "object") throw new Error("The service is unavailable. Please try again.");
    // The hotel route reports failures as { error: "code" } with a non-200 status; cars and bikes as { error: { code } }.
    if (!res.ok) throw new Error(ERRORS[typeof body.error === "string" ? body.error : body.error?.code] || "The service is unavailable. Please try again.");
    if (!body.success) {
      const code = body.error?.error_code || body.error?.code;
      if (code === "NO_RESULTS" || code === "NO_BIKES_AVAILABLE") return { items: [], meta: null };
      throw new Error(ERRORS[code] || body.error?.message || "Couldn’t load this section.");
    }
    if (kind === "hotels") return { items: (body.properties || []).slice(0, FEED_LIMIT), meta: body.search_metadata || null };
    const meta = body.search_metadata || null;
    const list = kind === "cars" ? body.vehicles : body.bikes;
    return { items: withTrip(kind, (list || []).slice(0, FEED_LIMIT), meta, city), meta };
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(ERRORS.timeout);
    if (e instanceof TypeError) throw new Error("Network error. Check your connection and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Loads one feed section per category, only when asked (the page asks when a section scrolls into view).
export function useFeed(city) {
  const [sections, setSections] = useState({ hotels: IDLE, cars: IDLE, bikes: IDLE });
  const cityRef = useRef(city.id);
  const running = useRef({});

  // A different city starts every section over (cached sections come back instantly when they load).
  useEffect(() => {
    cityRef.current = city.id;
    running.current = {};
    setSections({ hotels: IDLE, cars: IDLE, bikes: IDLE });
  }, [city.id]);

  const set = (kind, value) => setSections((s) => ({ ...s, [kind]: value }));

  const load = useCallback(async (kind, { force = false } = {}) => {
    const id = city.id;
    const runKey = `${id}:${kind}`;
    if (running.current[runKey]) return;
    const cacheKey = `${PREFIX}${id}:${kind}:${feedDates().start}`;
    if (!force) {
      const hit = readCache(cacheKey);
      if (hit) { set(kind, { status: "ready", items: hit.items, meta: hit.meta || null, error: "" }); return; }
    }
    running.current[runKey] = true;
    set(kind, { ...IDLE, status: "loading" });
    try {
      const out = await fetchSection(kind, city);
      if (cityRef.current !== id) return; // the user switched city while this was loading
      if (out.items.length) writeCache(cacheKey, out);
      set(kind, { status: "ready", items: out.items, meta: out.meta, error: "" });
    } catch (e) {
      if (cityRef.current === id) set(kind, { ...IDLE, status: "error", error: e.message });
    } finally {
      delete running.current[runKey];
    }
  }, [city]);

  return { sections, load };
}
