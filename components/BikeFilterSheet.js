"use client";
import { useState } from "react";
import Sheet from "./Sheet";
import { BIKE_TYPES, TRANSMISSION_OPTIONS, DEFAULT_BIKE_FILTERS } from "../lib/bikes";

// Server-side filters: they are sent to the function with the search ("Show bikes" re-runs it).
export default function BikeFilterSheet({ open, onClose, filters, setFilters, onApply, hasSearched, currency }) {
  const [error, setError] = useState("");
  const set = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const chips = (label, key, options) => (
    <fieldset className="group">
      <legend>{label}</legend>
      <div className="chips wrap" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.label} type="button" className="chip" aria-pressed={filters[key] === o.value} onClick={() => set(key, o.value)}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
  const range = (label, a, b, unit) => (
    <fieldset className="group">
      <legend>{label}</legend>
      <div className="two">
        {[["Minimum", a], ["Maximum", b]].map(([t, k]) => (
          <label className="plain-field" key={k}>
            <span>{t}{unit ? ` (${unit})` : ""}</span>
            <input type="number" inputMode="numeric" min="0" placeholder="Any" value={filters[k]} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
      </div>
    </fieldset>
  );
  function apply() {
    const n = (v) => (v === "" ? null : Number(v));
    if (n(filters.minPrice) != null && n(filters.maxPrice) != null && n(filters.minPrice) > n(filters.maxPrice)) return setError("Minimum price can’t be higher than the maximum.");
    if (n(filters.minEngine) != null && n(filters.maxEngine) != null && n(filters.minEngine) > n(filters.maxEngine)) return setError("Minimum engine size can’t be higher than the maximum.");
    setError(""); onApply();
  }
  return (
    <Sheet open={open} onClose={onClose} title="Filters"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => { setError(""); setFilters(DEFAULT_BIKE_FILTERS); }}>Reset</button>
          <button type="button" className="btn btn-primary grow" onClick={apply}>{hasSearched ? "Show bikes" : "Save filters"}</button>
        </>
      }>
      {chips("Bike type", "bikeType", BIKE_TYPES)}
      {chips("Transmission", "transmission", TRANSMISSION_OPTIONS)}
      {range("Total price for your rental", "minPrice", "maxPrice", currency)}
      {range("Engine size", "minEngine", "maxEngine", "cc")}
      <p className="muted small">Engine size and transmission are only known for bikes whose listing states them, so those filters can hide bikes that don’t.</p>
      {error && <div className="notice err" role="alert">{error}</div>}
    </Sheet>
  );
}
