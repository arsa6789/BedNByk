"use client";
import Sheet from "./Sheet";
import { DEFAULT_CAR_FILTERS, SEAT_OPTIONS, distinct } from "../lib/cars";

// Client-side filters only: they narrow the cars already returned (the function has no server-side filters).
export default function CarFilterSheet({ open, onClose, filters, setFilters, vehicles, shown, currency }) {
  const set = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const transmissions = distinct(vehicles, "transmission");
  const categories = distinct(vehicles, "vehicle_category");
  const hasResults = vehicles.length > 0;

  const chipGroup = (label, key, options) => (
    <fieldset className="group">
      <legend>{label}</legend>
      <div className="chips wrap" role="group" aria-label={label}>
        <button type="button" className="chip" aria-pressed={filters[key] === ""} onClick={() => set(key, "")}>Any</button>
        {options.map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={filters[key] === o} onClick={() => set(key, o)}>{o}</button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Filters"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => setFilters(DEFAULT_CAR_FILTERS)}>Reset</button>
          <button type="button" className="btn btn-primary grow" onClick={onClose}>
            {hasResults ? `Show ${shown} car${shown === 1 ? "" : "s"}` : "Done"}
          </button>
        </>
      }>
      {!hasResults && <p className="muted small">Filters narrow the cars returned by a search. Run a search first to see the options.</p>}
      {transmissions.length > 0 && chipGroup("Transmission", "transmission", transmissions)}
      {categories.length > 0 && chipGroup("Car type", "category", categories)}

      <fieldset className="group">
        <legend>Seats</legend>
        <div className="chips" role="group" aria-label="Minimum seats">
          {SEAT_OPTIONS.map((o) => (
            <button key={o.label} type="button" className="chip" aria-pressed={filters.seats === o.value} onClick={() => set("seats", o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend>Maximum total price</legend>
        <label className="plain-field">
          <span>{currency ? `In ${currency}` : "Total for the rental"}</span>
          <input type="number" inputMode="numeric" min="0" placeholder="Any" value={filters.maxTotal}
            onChange={(e) => set("maxTotal", e.target.value)} />
        </label>
      </fieldset>

      <fieldset className="group">
        <legend>Extras</legend>
        <label className="switch-row">
          <span><strong>Free cancellation only</strong><small>Hide cars you can’t cancel for free</small></span>
          <input type="checkbox" role="switch" checked={filters.freeCancellation} onChange={(e) => set("freeCancellation", e.target.checked)} />
        </label>
        <label className="switch-row">
          <span><strong>Air conditioning</strong><small>Only cars with A/C</small></span>
          <input type="checkbox" role="switch" checked={filters.airCon} onChange={(e) => set("airCon", e.target.checked)} />
        </label>
      </fieldset>
    </Sheet>
  );
}
