"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Sheet from "./Sheet";
import LazyMap from "./LazyMap";
import { PinIcon, SearchIcon, CheckIcon } from "./Icons";
import { searchPlaces, reversePlace } from "../lib/map";

// Choose a place on a map: search by name, tap the map, drag the pin, or use your location.
// The booking services only accept place NAMES, so the pin is turned into a name with OpenStreetMap
// (reverse geocoding) and the caller puts that name in its text field.
//
// Props: open, onClose, title, kind ("pickup" | "dropoff" | "place"), initial (place | null),
//        hint (text to pre-search when there is no pin yet), near ({lat,lng} to centre on), onConfirm(place)
export default function LocationPicker({ open, onClose, title, kind = "place", initial = null, hint = "", near = null, onConfirm }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);       // searching
  const [naming, setNaming] = useState(false);   // reverse-geocoding the pin
  const [error, setError] = useState("");
  const [pin, setPin] = useState(null);          // { lat, lng, label, city, country }
  const [view, setView] = useState(null);
  const seq = useRef(0);
  const viewN = useRef(0);

  const moveTo = (lat, lng, zoom = 15) => setView({ lat, lng, zoom, n: ++viewN.current });

  async function runSearch(q) {
    const text = (q ?? query).trim();
    if (text.length < 2) { setError("Type at least 2 letters to search."); return; }
    const id = ++seq.current;
    setBusy(true); setError(""); setResults([]);
    try {
      const found = await searchPlaces(text);
      if (id !== seq.current) return;
      setResults(found);
      if (!found.length) setError("No places found. Try a nearby city, street or landmark, or tap the map.");
    } catch (e) {
      if (id === seq.current) setError(e.message || "Search failed. Please try again.");
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }

  // A tapped / dragged / located point: show the pin immediately, then fetch its name.
  async function placePin(lat, lng) {
    const id = ++seq.current;
    setPin({ lat, lng, label: "Dropped pin", city: "", country: "" });
    setNaming(true); setError("");
    try {
      const named = await reversePlace(lat, lng);
      if (id !== seq.current) return;
      if (named) setPin(named);
      else setError("Couldn’t find a name for that spot. Try a spot closer to a road or town.");
    } catch (e) {
      if (id === seq.current) setError(e.message || "Couldn’t name that spot.");
    } finally {
      if (id === seq.current) setNaming(false);
    }
  }

  function choose(place) {
    seq.current++;
    setPin(place); setResults([]); setError(""); setNaming(false);
    moveTo(place.lat, place.lng);
  }

  function locateMe() {
    if (!navigator.geolocation) { setError("Your browser can’t share its location."); return; }
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { moveTo(pos.coords.latitude, pos.coords.longitude); placePin(pos.coords.latitude, pos.coords.longitude); },
      () => setError("Couldn’t get your location. Allow location access, or search for a place instead."),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  // Reset every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    seq.current++;
    setResults([]); setError(""); setBusy(false); setNaming(false);
    setPin(initial || null);
    setQuery(initial ? "" : hint || "");
    if (initial) moveTo(initial.lat, initial.lng, 14);
    else if (near) moveTo(near.lat, near.lng, 12);
    else setView(null);
    if (!initial && hint && hint.trim().length >= 3) runSearch(hint); // one automatic search for the text already typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const markers = useMemo(() => (pin ? [{
    id: "pin", lat: pin.lat, lng: pin.lng, kind: kind === "dropoff" ? "dropoff" : "pickup",
    label: kind === "dropoff" ? "B" : kind === "pickup" ? "A" : "•", title: pin.label, draggable: true,
  }] : []), [pin, kind]);

  return (
    <Sheet open={open} onClose={onClose} title={title} className="sheet-map"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary grow" disabled={!pin || naming || pin.label === "Dropped pin"}
            onClick={() => { onConfirm(pin); onClose(); }}>
            <CheckIcon width={16} height={16} /> {naming ? "Finding place…" : "Use this location"}
          </button>
        </>
      }>
      <div className="picker">
        <form className="picker-search" role="search" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); runSearch(); }}>
          <label className="field">
            <SearchIcon />
            <span className="field-body">
              <span className="field-label">Search a place</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Airport, street, hotel or city"
                autoComplete="off" enterKeyHint="search" />
            </span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Searching…" : "Search"}</button>
        </form>

        <div className="picker-tools">
          <button type="button" className="chip" onClick={locateMe}><PinIcon width={15} height={15} /> Use my location</button>
          <span className="muted small">or tap the map · drag the pin to adjust</span>
        </div>

        {error && <div className="notice err" role="alert">{error}</div>}

        {results.length > 0 && (
          <ul className="picker-results" aria-label="Search results">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`}>
                <button type="button" onClick={() => choose(r)}>
                  <PinIcon width={16} height={16} />
                  <span><strong>{r.label}</strong>{r.country && <small>{[r.city, r.country].filter(Boolean).join(", ")}</small>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <LazyMap markers={markers} selectedId="pin" view={view} label={`${title} map`}
          onMapClick={({ lat, lng }) => placePin(lat, lng)}
          onDragEnd={(_, { lat, lng }) => placePin(lat, lng)}
          onSelect={() => {}} />

        <p className="picker-current" aria-live="polite">
          {pin
            ? <><PinIcon width={16} height={16} /> <span>{naming ? "Finding the name of this spot…" : pin.label}{!naming && pin.country ? <small> · {[pin.city, pin.country].filter(Boolean).join(", ")}</small> : null}</span></>
            : <span className="muted">No location chosen yet.</span>}
        </p>
      </div>
    </Sheet>
  );
}
