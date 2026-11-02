"use client";
import { useEffect, useMemo, useState } from "react";
import { geocodeText } from "./map";

const MAX_LOOKUPS = 10; // Nominatim allows 1 request per second, so only the first few shops are placed

// Bike search results only have a text address. This looks each distinct address up on OpenStreetMap
// (one at a time, cached on this device) so the shops can be shown as pins.
//   places: { [address]: place | null }   null = the address could not be placed
export function useBikePlaces(addresses, cityHint, enabled) {
  const [places, setPlaces] = useState({});
  const list = useMemo(() => [...new Set(addresses.filter(Boolean))].slice(0, MAX_LOOKUPS), [addresses]);
  const key = `${enabled}|${cityHint}|${list.join("§")}`;

  useEffect(() => {
    if (!enabled || !list.length) return;
    let cancelled = false;
    (async () => {
      for (const addr of list) {
        if (cancelled) return;
        const q = cityHint && !addr.toLowerCase().includes(cityHint.toLowerCase()) ? `${addr}, ${cityHint}` : addr;
        let place = null;
        try { place = await geocodeText(q); } catch { /* leave null: the pin is simply skipped */ }
        if (cancelled) return;
        setPlaces((prev) => (addr in prev ? prev : { ...prev, [addr]: place }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const done = list.filter((a) => a in places).length;
  const failed = list.filter((a) => places[a] === null).length;
  return { places, total: list.length, done, failed, loading: enabled && done < list.length };
}
