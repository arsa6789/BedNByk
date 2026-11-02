"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CAR_FORM, DEFAULT_CAR_FILTERS, defaultCarDates, validateCar, buildCarPayload, applyCarFilters, sortCars,
} from "./cars";

// Empty on Vercel (same origin). For the Capacitor app it is your deployed Vercel URL.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const SAVED_CARS_KEY = "stayfinder:saved-cars:v1"; // separate from saved hotels
const CLIENT_TIMEOUT_MS = 70_000;                   // a little above the server route's 55s upstream timeout
const MAX_PAGES = 20;                               // the function's own paging limit

const ERRORS = {
  rate_limited: "Too many searches. Please wait a minute and try again.",
  timeout: "The car search took too long to respond. Please try again.",
  bad_request: "Please check your search details and try again.",
  server_not_configured: "The server has no NOTTE_API_KEY set yet.",
  bad_api_key: "The server’s Notte API key was rejected.",
  unexpected_response: "The car search returned an unexpected response. Please try again.",
};
// Codes the function itself returns (seen in real runs) -> friendlier text
const FUNCTION_ERRORS = {
  LOCATION_NOT_FOUND: "We couldn’t find that location. Try a city or airport name, e.g. “London Heathrow Airport”.",
};

// All car-rental state lives here so page.js stays small and results survive switching tabs.
// opts.onSearch(snapshot) is called whenever a valid search starts (used for the History tab).
export function useCarSearch(opts = {}) {
  const [form, setForm] = useState(DEFAULT_CAR_FORM);
  const [formError, setFormError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [notice, setNotice] = useState(null); // { kind: "error" | "empty", message }
  const [vehicles, setVehicles] = useState([]);
  const [meta, setMeta] = useState(null);
  const [query, setQuery] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_CAR_FILTERS);
  const [sort, setSort] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [saved, setSaved] = useState([]);
  const [infoNote, setInfoNote] = useState("");
  const inflight = useRef(false);
  const onSearch = useRef(opts.onSearch);
  onSearch.current = opts.onSearch;

  // Default dates after mount so server and client HTML match.
  useEffect(() => {
    setForm((p) => (p.pickupDate ? p : { ...p, ...defaultCarDates() }));
  }, []);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_CARS_KEY) || "[]");
      if (Array.isArray(raw)) setSaved(raw);
    } catch {}
  }, []);

  const savedIds = useMemo(() => new Set(saved.map((v) => v.vehicle_id)), [saved]);

  function toggleSaved(vehicle) {
    setSaved((prev) => {
      const exists = prev.some((v) => v.vehicle_id === vehicle.vehicle_id);
      // Keep the trip with the car so a saved price still makes sense later.
      const entry = { ...vehicle, trip: vehicle.trip || (meta ? {
        pickup_location: meta.pickup_location, dropoff_location: meta.dropoff_location,
        pickup_date: meta.pickup_date, dropoff_date: meta.dropoff_date, rental_days: meta.rental_days,
      } : null) };
      const next = exists ? prev.filter((v) => v.vehicle_id !== vehicle.vehicle_id) : [entry, ...prev];
      try { localStorage.setItem(SAVED_CARS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function post(payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/api/cars/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => null);
      if (!body || typeof body !== "object") throw new Error("The car search service is unavailable. Please try again.");
      if (!body.success) {
        const code = body.error?.code;
        const err = new Error(FUNCTION_ERRORS[code] || ERRORS[code] || body.error?.message || "The search failed. Please try again.");
        err.code = code;
        throw err;
      }
      return body;
    } catch (e) {
      if (e?.name === "AbortError") throw new Error(ERRORS.timeout);
      if (e instanceof TypeError) throw new Error("Network error. Check your connection and try again.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  // Returns true when a search actually started (so the page can scroll / collapse the form).
  async function search(f = form) {
    if (inflight.current) return false; // no duplicate submissions
    const problem = validateCar(f);
    if (problem) { setFormError(problem); return false; }
    setFormError("");

    let payload = buildCarPayload(f, 1);
    inflight.current = true;
    onSearch.current?.({ form: f });
    setQuery(payload); setHasSearched(true);
    setLoading(true); setNotice(null); setVehicles([]); setMeta(null); setMoreError(""); setInfoNote("");
    setFilters(DEFAULT_CAR_FILTERS); setOnlySaved(false);
    try {
      let body;
      try {
        body = await post(payload);
      } catch (e) {
        // A map pin gives an exact address that Rentalcars may not know. Retry once with the pin's city.
        const alt = e.code === "LOCATION_NOT_FOUND" ? cityFallback(f, payload) : null;
        if (!alt) throw e;
        payload = alt;
        setQuery(alt);
        body = await post(alt);
        setInfoNote("That exact address wasn’t recognised, so we searched the nearest city instead.");
      }
      setVehicles(body.vehicles);
      setMeta(body.search_metadata);
      if (!body.vehicles.length) {
        setNotice({ kind: "empty", message: "No cars were found for these dates and locations. Try different dates or a nearby location." });
      }
    } catch (e) {
      setNotice({ kind: "error", message: e.message });
    } finally {
      inflight.current = false;
      setLoading(false);
    }
    return true;
  }

  // Replace pin-based addresses by their city (only for locations that came from a map pin).
  function cityFallback(f, payload) {
    const out = { ...payload };
    let changed = false;
    if (f.pickupPin?.city && f.pickupPin.label === payload.pickup_location && f.pickupPin.city !== payload.pickup_location) {
      out.pickup_location = f.pickupPin.city; changed = true;
    }
    if (f.differentDropoff && f.dropoffPin?.city && f.dropoffPin.label === payload.dropoff_location && f.dropoffPin.city !== payload.dropoff_location) {
      out.dropoff_location = f.dropoffPin.city; changed = true;
    }
    return changed ? out : null;
  }

  const page = meta?.page || 1;
  const hasMore =
    !!meta && page < MAX_PAGES &&
    (meta.pageable_results ?? meta.total_available ?? 0) > vehicles.length &&
    (meta.results_count ?? 0) > 0;

  async function loadMore() {
    if (inflight.current || !query || !hasMore) return;
    inflight.current = true;
    setLoadingMore(true); setMoreError("");
    try {
      const body = await post({ ...query, page: page + 1 });
      setVehicles((prev) => {
        const seen = new Set(prev.map((v) => v.vehicle_id));
        return [...prev, ...body.vehicles.filter((v) => !v.vehicle_id || !seen.has(v.vehicle_id))];
      });
      setMeta(body.search_metadata || meta);
    } catch (e) {
      setMoreError(e.message);
    } finally {
      inflight.current = false;
      setLoadingMore(false);
    }
  }

  const visible = useMemo(() => {
    let list = applyCarFilters(vehicles, filters);
    if (onlySaved) list = list.filter((v) => savedIds.has(v.vehicle_id));
    return sortCars(list, sort);
  }, [vehicles, filters, onlySaved, sort, savedIds]);

  return {
    form, setForm, formError, hasSearched, loading, loadingMore, moreError, notice, vehicles, meta, query,
    filters, setFilters, sort, setSort, onlySaved, setOnlySaved, saved, savedIds, toggleSaved,
    visible, hasMore, search, loadMore, infoNote,
  };
}
