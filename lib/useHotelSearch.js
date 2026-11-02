"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FORM, addDays, today, validate, buildPayload, activeFilterCount } from "./search";

// Empty on Vercel (same origin). For the Capacitor app it is your deployed Vercel URL.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const SAVED_KEY = "stayfinder:saved:v2"; // full hotel objects, so Saved works offline of any search
const CLIENT_TIMEOUT_MS = 70_000;        // a little above the server route's 55s upstream timeout

const ERRORS = {
  rate_limited: "Too many searches. Please wait a minute and try again.",
  timeout: "Booking.com took too long to respond. Please try again.",
  bad_request: "Please check your search details and try again.",
  server_not_configured: "The server has no NOTTE_API_KEY set yet.",
  bad_api_key: "The server’s Notte API key was rejected.",
};
const NO_STAYS = "No stays matched. Try wider dates, a higher max price or fewer filters.";

// All hotel-search state (it used to live in page.js). Same behaviour, now shaped like useCarSearch / useBikeSearch.
// opts.onSearch(snapshot) is called whenever a valid search starts (used for the History tab).
export function useHotelSearch(opts = {}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [ages, setAges] = useState([]);
  const [formError, setFormError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: "error" | "empty", message }
  const [data, setData] = useState(null);
  const [query, setQuery] = useState(null);
  const [sort, setSort] = useState("");
  const [onlyFree, setOnlyFree] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [saved, setSaved] = useState([]);
  const inflight = useRef(false);
  const onSearch = useRef(opts.onSearch);
  onSearch.current = opts.onSearch;

  // Default dates are set after mount so server and client HTML match.
  useEffect(() => {
    setForm((p) => (p.checkin ? p : { ...p, checkin: addDays(today(), 30), checkout: addDays(today(), 33) }));
  }, []);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
      if (Array.isArray(raw)) setSaved(raw);
    } catch {}
  }, []);

  const savedIds = useMemo(() => new Set(saved.map((p) => p.property_id)), [saved]);

  function toggleSaved(hotel) {
    setSaved((prev) => {
      const exists = prev.some((p) => p.property_id === hotel.property_id);
      const next = exists ? prev.filter((p) => p.property_id !== hotel.property_id) : [hotel, ...prev];
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Returns true when a search actually started (so the page can scroll / collapse the form).
  async function search(f = form, a = ages) {
    if (inflight.current) return false; // no duplicate submissions
    const problem = validate(f);
    if (problem) { setFormError(problem); return false; }
    setFormError("");

    const payload = buildPayload(f, a);
    inflight.current = true;
    onSearch.current?.({ form: f, ages: a });
    setQuery(payload); setHasSearched(true);
    setLoading(true); setNotice(null); setData(null);
    setOnlyFree(false); setOnlySaved(false);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(ERRORS[body.error] || "The search service is unavailable. Please try again.");
      if (!body.success) {
        if (body.error?.error_code === "NO_RESULTS") setNotice({ kind: "empty", message: NO_STAYS });
        else setNotice({ kind: "error", message: body.error?.message || "The search failed. Please try again." });
        return true;
      }
      setData(body);
      if (!body.properties?.length) setNotice({ kind: "empty", message: NO_STAYS });
    } catch (e) {
      const message =
        e?.name === "AbortError" ? ERRORS.timeout
        : e instanceof TypeError ? "Network error. Check your connection and try again."
        : e.message;
      setNotice({ kind: "error", message });
    } finally {
      clearTimeout(timer);
      inflight.current = false;
      setLoading(false);
    }
    return true;
  }

  const meta = data?.search_metadata || {};
  const all = useMemo(() => data?.properties || [], [data]);
  const filterCount = activeFilterCount(form);

  const visible = useMemo(() => {
    let list = [...all];
    if (onlyFree) list = list.filter((p) => p.has_free_cancellation);
    if (onlySaved) list = list.filter((p) => savedIds.has(p.property_id));
    if (sort === "price") list.sort((a, b) => (a.total_price ?? Infinity) - (b.total_price ?? Infinity));
    if (sort === "rating") list.sort((a, b) => (b.rating_score || 0) - (a.rating_score || 0));
    return list;
  }, [all, onlyFree, onlySaved, sort, savedIds]);

  return {
    form, setForm, ages, setAges, formError, hasSearched, loading, notice, data, query, meta, all, visible,
    sort, setSort, onlyFree, setOnlyFree, onlySaved, setOnlySaved, saved, savedIds, toggleSaved, filterCount, search,
  };
}
