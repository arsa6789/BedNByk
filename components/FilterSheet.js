"use client";
import { useState } from "react";
import Sheet from "./Sheet";
import { CURRENCIES, STAR_OPTIONS, DEFAULT_FORM } from "../lib/search";

// Search filters. These are sent to the API on "Show stays" (same parameter names as before):
// min_price, max_price, star_rating, free_cancellation, currency.
export default function FilterSheet({ open, onClose, form, setForm, onApply, hasSearched }) {
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function apply() {
    if (form.minPrice !== "" && form.maxPrice !== "" && Number(form.minPrice) > Number(form.maxPrice)) {
      setError("Minimum price can’t be higher than the maximum.");
      return;
    }
    setError("");
    onApply();
  }

  function reset() {
    setError("");
    setForm((p) => ({
      ...p,
      minPrice: DEFAULT_FORM.minPrice, maxPrice: DEFAULT_FORM.maxPrice, stars: DEFAULT_FORM.stars,
      freeCancellation: DEFAULT_FORM.freeCancellation, currency: DEFAULT_FORM.currency,
    }));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={reset}>Reset</button>
          <button type="button" className="btn btn-primary grow" onClick={apply}>
            {hasSearched ? "Show stays" : "Save filters"}
          </button>
        </>
      }
    >
      <fieldset className="group">
        <legend>Star rating</legend>
        <div className="chips" role="group" aria-label="Star rating">
          {STAR_OPTIONS.map((o) => (
            <button key={o.label} type="button" className="chip" aria-pressed={form.stars === o.value}
              onClick={() => set("stars", o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="group">
        <legend>Total price for your stay</legend>
        <div className="two">
          <label className="plain-field">
            <span>Minimum</span>
            <input type="number" inputMode="numeric" min="0" placeholder="Any" value={form.minPrice}
              onChange={(e) => set("minPrice", e.target.value)} />
          </label>
          <label className="plain-field">
            <span>Maximum</span>
            <input type="number" inputMode="numeric" min="0" placeholder="Any" value={form.maxPrice}
              onChange={(e) => set("maxPrice", e.target.value)} />
          </label>
        </div>
        <label className="plain-field">
          <span>Currency</span>
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset className="group">
        <legend>Booking flexibility</legend>
        <label className="switch-row">
          <span>
            <strong>Free cancellation only</strong>
            <small>Hide stays you can’t cancel for free</small>
          </span>
          <input type="checkbox" role="switch" checked={form.freeCancellation}
            onChange={(e) => set("freeCancellation", e.target.checked)} />
        </label>
      </fieldset>

      {error && <div className="notice err" role="alert">{error}</div>}
    </Sheet>
  );
}
