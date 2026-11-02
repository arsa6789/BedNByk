"use client";
import { useState } from "react";
import { PinIcon, CalendarIcon, UsersIcon, SlidersIcon, SearchIcon, ClockIcon, MapIcon } from "./Icons";
import LocationPicker from "./LocationPicker";
import { today, addDays } from "../lib/search";
import { CAR_POPULAR, CAR_CURRENCIES, TIMES, applyCarPin } from "../lib/cars";

// Controlled form. Fields map 1:1 to the Rentalcars function's parameters.
export default function CarSearchForm({ form, setForm, onSubmit, onOpenFilters, filterCount, loading, error }) {
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [picker, setPicker] = useState(null); // null | "pickup" | "dropoff"

  function setPickupDate(v) {
    setForm((p) => ({ ...p, pickupDate: v, dropoffDate: !p.dropoffDate || p.dropoffDate < v ? addDays(v, 3) : p.dropoffDate }));
  }

  const timeSelect = (label, key) => (
    <label className="field">
      <ClockIcon />
      <span className="field-body">
        <span className="field-label">{label}</span>
        <select value={form[key]} onChange={(e) => set(key, e.target.value)}>
          {TIMES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </span>
    </label>
  );

  return (
    <>
    <form className="search-form" noValidate aria-label="Search car rentals"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="row-actions">
        <label className="field">
          <PinIcon />
          <span className="field-body">
            <span className="field-label">Pickup location</span>
            <input value={form.pickup} onChange={(e) => setForm((p) => ({ ...p, pickup: e.target.value, pickupPin: null }))}
              placeholder="City or airport" autoComplete="off" enterKeyHint="search" />
          </span>
        </label>
        <button type="button" className={`square-btn${form.pickupPin ? " is-set" : ""}`} aria-label="Set pick-up point on map"
          aria-haspopup="dialog" onClick={() => setPicker("pickup")}>
          <MapIcon />
        </button>
      </div>

      <div className="chips" role="group" aria-label="Popular pickup locations">
        {CAR_POPULAR.map((d) => (
          <button type="button" key={d} className="chip" aria-pressed={form.pickup === d}
            onClick={() => setForm((p) => ({ ...p, pickup: d, pickupPin: null }))}>
            {d.replace(/ (International )?Airport$/, "").replace("Charles de Gaulle", "CDG")}
          </button>
        ))}
      </div>

      <label className="switch-row compact">
        <span><strong>Return to a different location</strong></span>
        <input type="checkbox" role="switch" checked={form.differentDropoff}
          onChange={(e) => set("differentDropoff", e.target.checked)} />
      </label>
      {form.differentDropoff && (
        <div className="row-actions">
          <label className="field">
            <PinIcon />
            <span className="field-body">
              <span className="field-label">Return location</span>
              <input value={form.dropoff} onChange={(e) => setForm((p) => ({ ...p, dropoff: e.target.value, dropoffPin: null }))}
                placeholder="City or airport" autoComplete="off" />
            </span>
          </label>
          <button type="button" className={`square-btn${form.dropoffPin ? " is-set" : ""}`} aria-label="Set drop-off point on map"
            aria-haspopup="dialog" onClick={() => setPicker("dropoff")}>
            <MapIcon />
          </button>
        </div>
      )}

      <div className="two">
        <label className="field">
          <CalendarIcon />
          <span className="field-body">
            <span className="field-label">Pickup date</span>
            <input type="date" value={form.pickupDate} min={today()} onChange={(e) => setPickupDate(e.target.value)} />
          </span>
        </label>
        {timeSelect("Pickup time", "pickupTime")}
      </div>
      <div className="two">
        <label className="field">
          <CalendarIcon />
          <span className="field-body">
            <span className="field-label">Return date</span>
            <input type="date" value={form.dropoffDate} min={form.pickupDate || today()}
              onChange={(e) => set("dropoffDate", e.target.value)} />
          </span>
        </label>
        {timeSelect("Return time", "dropoffTime")}
      </div>

      <div className="two">
        <label className="field">
          <UsersIcon />
          <span className="field-body">
            <span className="field-label">Driver age</span>
            <input type="number" inputMode="numeric" min="18" max="99" value={form.driverAge}
              onChange={(e) => set("driverAge", e.target.value === "" ? "" : Number(e.target.value))} />
          </span>
        </label>
        <div className="row-actions">
          <label className="field">
            <span className="field-body">
              <span className="field-label">Currency</span>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {CAR_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </span>
          </label>
          <button type="button" className="square-btn" aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`}
            aria-haspopup="dialog" onClick={onOpenFilters}>
            <SlidersIcon />
            {filterCount > 0 && <b className="dot-badge" aria-hidden="true">{filterCount}</b>}
          </button>
        </div>
      </div>

      {error && <div className="notice err" role="alert">{error}</div>}

      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        <SearchIcon />
        {loading ? "Searching…" : "Search cars"}
      </button>
    </form>

    <LocationPicker open={picker !== null} onClose={() => setPicker(null)} kind={picker || "pickup"}
      title={picker === "dropoff" ? "Drop-off point" : "Pick-up point"}
      initial={picker === "dropoff" ? form.dropoffPin : form.pickupPin}
      hint={picker === "dropoff" ? form.dropoff : form.pickup}
      onConfirm={(place) => setForm((p) => applyCarPin(p, picker || "pickup", place))} />
    </>
  );
}
