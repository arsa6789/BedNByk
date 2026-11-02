"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BIKE_FORM, DEFAULT_BIKE_FILTERS, defaultBikeDates, validateBike, buildBikePayload, sortBikes } from "./bikes";

// Empty on Vercel (same origin). For the Capacitor app it is your deployed Vercel URL.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const SAVED_BIKES_KEY = "stayfinder:saved-bikes:v1"; // separate from saved hotels and cars
const CLIENT_TIMEOUT_MS = 45_000;                    // server upstream timeout is 35s

const ERRORS = {
  rate_limited: "Too many requests. Please wait a minute and try again.",
  timeout: "The bike search took too long to respond. Please try again.",
  bad_request: "Please check your search details and try again.",
  server_not_configured: "The server has no NOTTE_API_KEY set yet.",
  bad_api_key: "The server’s Notte API key was rejected.",
  unexpected_response: "The service returned an unexpected response. Please try again.",
  INVALID_INPUT: "BikesBooking doesn’t recognise that. Try a city name such as “Barcelona”.",
  INVALID_DATES: "The return date must be after the pickup date.",
};

async function postJson(path, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    if (!body || typeof body !== "object") throw new Error("The service is unavailable. Please try again.");
    return body;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(ERRORS.timeout);
    if (e instanceof TypeError) throw new Error("Network error. Check your connection and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
const explain = (body, fallback) => ERRORS[body.error?.code] || body.error?.message || fallback;

// opts.onSearch(snapshot) is called whenever a valid search starts (used for the History tab).
export function useBikeSearch(opts = {}) {
  const [form, setForm] = useState(DEFAULT_BIKE_FORM);
  const [filters, setFilters] = useState(DEFAULT_BIKE_FILTERS);
  const [formError, setFormError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [notice, setNotice] = useState(null); // { kind: "error" | "empty", message }
  const [bikes, setBikes] = useState([]);
  const [meta, setMeta] = useState(null);
  const [query, setQuery] = useState(null);   // payload of the last search (page 1)
  const [sort, setSort] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [saved, setSaved] = useState([]);
  const [details, setDetails] = useState({ open: false, bike: null, loading: false, error: "", data: null });
  const inflight = useRef(false);
  const onSearch = useRef(opts.onSearch);
  onSearch.current = opts.onSearch;
  const detailsSeq = useRef(0);

  useEffect(() => { setForm((p) => (p.pickupDate ? p : { ...p, ...defaultBikeDates() })); }, []);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_BIKES_KEY) || "[]");
      if (Array.isArray(raw)) setSaved(raw);
    } catch {}
  }, []);

  const savedIds = useMemo(() => new Set(saved.map((b) => b.bike_id)), [saved]);

  function toggleSaved(bike) {
    setSaved((prev) => {
      const exists = prev.some((b) => b.bike_id === bike.bike_id);
      const trip = bike.trip || (meta ? {
        city: meta.resolved_location, pickup_date: meta.pickup_date, return_date: meta.return_date,
        pickup_time: meta.pickup_time, return_time: meta.return_time, rental_days: meta.rental_days,
      } : null);
      const next = exists ? prev.filter((b) => b.bike_id !== bike.bike_id) : [{ ...bike, trip }, ...prev];
      try { localStorage.setItem(SAVED_BIKES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Returns true when a search actually started.
  async function search(f = form, flt = filters) {
    if (inflight.current) return false;
    const problem = validateBike(f, flt);
    if (problem) { setFormError(problem); return false; }
    setFormError("");
    const payload = buildBikePayload(f, flt, 1);
    inflight.current = true;
    onSearch.current?.({ form: f, filters: flt });
    setQuery(payload); setHasSearched(true);
    setLoading(true); setNotice(null); setBikes([]); setMeta(null); setMoreError(""); setOnlySaved(false);
    try {
      const body = await postJson("/api/bikes/search", payload);
      if (!body.success) {
        // "no bikes" comes back as an error code but is really an empty result
        if (body.error?.code === "NO_BIKES_AVAILABLE") {
          setMeta(body.search_metadata);
          setNotice({ kind: "empty", message: "No bikes matched. Try other dates, another city or fewer filters." });
        } else {
          setNotice({ kind: "error", message: explain(body, "The search failed. Please try again.") });
        }
        return true;
      }
      setBikes(body.bikes); setMeta(body.search_metadata);
      if (!body.bikes.length) setNotice({ kind: "empty", message: "No bikes matched. Try other dates, another city or fewer filters." });
    } catch (e) {
      setNotice({ kind: "error", message: e.message });
    } finally {
      inflight.current = false;
      setLoading(false);
    }
    return true;
  }

  const page = meta?.page || 1;
  const hasMore = !!meta && page < (meta.total_pages || 0);

  async function loadMore() {
    if (inflight.current || !query || !hasMore) return;
    inflight.current = true;
    setLoadingMore(true); setMoreError("");
    try {
      const body = await postJson("/api/bikes/search", { ...query, page: page + 1 });
      if (!body.success) throw new Error(explain(body, "Couldn’t load more bikes."));
      setBikes((prev) => {
        const seen = new Set(prev.map((b) => b.bike_id));
        return [...prev, ...body.bikes.filter((b) => !b.bike_id || !seen.has(b.bike_id))];
      });
      setMeta(body.search_metadata || meta);
    } catch (e) {
      setMoreError(e.message);
    } finally {
      inflight.current = false;
      setLoadingMore(false);
    }
  }

  // Full details + booking info for one bike, fetched on demand for the dates that were searched.
  async function openDetails(bike) {
    const ctx = bike.trip ? null : query; // saved bikes carry their own trip; live ones use the last search
    const seq = ++detailsSeq.current;
    setDetails({ open: true, bike, loading: true, error: "", data: null });
    const payload = bike.trip
      ? {
          bike_id: bike.bike_id, destination: bike.trip.city || "", pickup_date: bike.trip.pickup_date, return_date: bike.trip.return_date,
          pickup_time: bike.trip.pickup_time || "10:00", return_time: bike.trip.return_time || "10:00", currency: bike.currency || "EUR",
        }
      : {
          bike_id: bike.bike_id, destination: ctx?.destination || "", pickup_date: ctx?.pickup_date, return_date: ctx?.return_date,
          pickup_time: ctx?.pickup_time, return_time: ctx?.return_time, currency: ctx?.currency,
        };
    try {
      const body = await postJson("/api/bikes/details", payload);
      if (seq !== detailsSeq.current) return; // a newer request replaced this one
      if (!body.success) throw new Error(explain(body, "Couldn’t load this bike’s details."));
      setDetails((d) => ({ ...d, loading: false, data: body.bike }));
    } catch (e) {
      if (seq !== detailsSeq.current) return;
      setDetails((d) => ({ ...d, loading: false, error: e.message }));
    }
  }
  const closeDetails = () => { detailsSeq.current++; setDetails((d) => ({ ...d, open: false })); };

  const visible = useMemo(() => {
    let list = bikes;
    if (onlySaved) list = list.filter((b) => savedIds.has(b.bike_id));
    return sortBikes(list, sort);
  }, [bikes, onlySaved, sort, savedIds]);

  return {
    form, setForm, filters, setFilters, formError, hasSearched, loading, loadingMore, moreError, notice, bikes, meta, query,
    sort, setSort, onlySaved, setOnlySaved, saved, savedIds, toggleSaved, visible, hasMore,
    search, loadMore, details, openDetails, closeDetails,
  };
}
