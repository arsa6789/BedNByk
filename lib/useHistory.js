"use client";
import { useCallback, useEffect, useState } from "react";
import { describeSearch } from "./history";

const KEY = "stayfinder:history:v1";
const MAX = 40;

// Recent searches and "booking page opened" entries, kept on this device only.
//   search:  { id, type: "search",  mode, ts, title, subtitle, snapshot }   (snapshot = what is needed to run it again)
//   booking: { id, type: "booking", mode, ts, title, subtitle, image, href, priceText }
// We can only know that a booking page was opened, not whether the booking was completed on the partner site.
export function useHistory() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(raw)) setEntries(raw.filter((e) => e && e.id && e.type));
    } catch {}
  }, []);

  const commit = useCallback((updater) => {
    setEntries((prev) => {
      const next = updater(prev).slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Newest first; the same search or booking is moved to the top instead of piling up.
  const add = useCallback((entry) => {
    commit((prev) => [{ ...entry, ts: Date.now() }, ...prev.filter((e) => e.id !== entry.id)]);
  }, [commit]);

  const addSearch = useCallback((mode, snapshot) => {
    const { title, subtitle } = describeSearch(mode, snapshot);
    if (!title) return;
    add({ id: `s:${mode}:${title.toLowerCase()}|${subtitle}`, type: "search", mode, title, subtitle, snapshot });
  }, [add]);

  const addBooking = useCallback((item) => {
    if (!item?.key) return;
    add({
      id: `b:${item.key}`, type: "booking", mode: item.kind === "hotel" ? "hotels" : item.kind === "car" ? "cars" : "bikes",
      title: item.title, subtitle: item.subtitle || "", image: item.image || null, href: item.href || null,
      priceText: item.priceText ? `${item.priceText} / ${item.unit}` : "",
    });
  }, [add]);

  const remove = useCallback((id) => commit((prev) => prev.filter((e) => e.id !== id)), [commit]);
  const clear = useCallback(() => commit(() => []), [commit]);

  return { entries, addSearch, addBooking, remove, clear };
}
