"use client";
import { useState } from "react";
import { PinIcon, CalendarIcon, SlidersIcon, SearchIcon, ClockIcon, MapIcon } from "./Icons";
import LocationPicker from "./LocationPicker";
import { today, addDays } from "../lib/search";
import { TIMES } from "../lib/cars";
import { BIKE_POPULAR, BIKE_CURRENCIES } from "../lib/bikes";

export default function BikeSearchForm({ form, setForm, onSubmit, onOpenFilters, filterCount, loading, error }) {
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const setPickup = (v) => setForm((p) => ({ ...p, pickupDate: v, returnDate: !p.returnDate || p.returnDate <= v ? addDays(v, 1) : p.returnDate }));
  const timeSelect = (label, key) => (
    <label className="field">
      <ClockIcon />
      <span className="field-body">
        <span className="field-label">{label}</span>
        <select value={form[key]} onChange={(e) => set(key, e.target.value)}>{TIMES.map((t) => <option key={t}>{t}</option>)}</select>
      </span>
    </label>
  );
  return (
    <>
    <form className="search-form" noValidate aria-label="Search bike rentals" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="row-actions">
        <label className="field">
          <PinIcon />
          <span className="field-body">
            <span className="field-label">City</span>
            <input value={form.destination} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value, destinationPin: null }))}
              placeholder="e.g. Barcelona" autoComplete="off" enterKeyHint="search" />
          </span>
        </label>
        <button type="button" className={`square-btn${form.destinationPin ? " is-set" : ""}`} aria-label="Choose city on map"
          aria-haspopup="dialog" onClick={() => setPickerOpen(true)}>
          <MapIcon />
        </button>
      </div>
      <div className="chips" role="group" aria-label="Popular cities">
        {BIKE_POPULAR.map((d) => (
          <button type="button" key={d} className="chip" aria-pressed={form.destination === d} onClick={() => setForm((p) => ({ ...p, destination: d, destinationPin: null }))}>{d}</button>
        ))}
      </div>
      <div className="two">
        <label className="field">
          <CalendarIcon />
          <span className="field-body">
            <span className="field-label">Pickup date</span>
            <input type="date" value={form.pickupDate} min={today()} onChange={(e) => setPickup(e.target.value)} />
          </span>
        </label>
        {timeSelect("Pickup time", "pickupTime")}
      </div>
      <div className="two">
        <label className="field">
          <CalendarIcon />
          <span className="field-body">
            <span className="field-label">Return date</span>
            <input type="date" value={form.returnDate} min={form.pickupDate ? addDays(form.pickupDate, 1) : today()}
              onChange={(e) => set("returnDate", e.target.value)} />
          </span>
        </label>
        {timeSelect("Return time", "returnTime")}
      </div>
      <div className="row-actions">
        <label className="field">
          <span className="field-body">
            <span className="field-label">Currency</span>
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              {BIKE_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </span>
        </label>
        <button type="button" className="square-btn" aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`}
          aria-haspopup="dialog" onClick={onOpenFilters}>
          <SlidersIcon />
          {filterCount > 0 && <b className="dot-badge" aria-hidden="true">{filterCount}</b>}
        </button>
      </div>
      {error && <div className="notice err" role="alert">{error}</div>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        <SearchIcon /> {loading ? "Searching…" : "Search bikes"}
      </button>
    </form>

    <LocationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} kind="place" title="Choose city"
      initial={form.destinationPin} hint={form.destination}
      onConfirm={(place) => setForm((p) => ({ ...p, destinationPin: place, destination: place.city || place.label }))} />
    </>
  );
}
