"use client";
import { useState } from "react";
import { PinIcon, CalendarIcon, UsersIcon, SlidersIcon, ChevronIcon, SearchIcon, MapIcon } from "./Icons";
import LocationPicker from "./LocationPicker";
import { POPULAR, today, addDays, plural } from "../lib/search";

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="stepper-row">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

// Controlled form: state lives in page.js so the filter sheet and search card share it.
export default function SearchForm({ form, setForm, ages, setAges, onSubmit, onOpenFilters, filterCount, loading, error }) {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function setCheckin(v) {
    setForm((p) => ({ ...p, checkin: v, checkout: !p.checkout || p.checkout <= v ? addDays(v, 1) : p.checkout }));
  }
  function setChildren(n) {
    set("children", n);
    setAges((a) => Array.from({ length: n }, (_, i) => a[i] ?? 8));
  }

  const guests = form.adults + form.children;

  return (
    <>
    <form className="search-form" noValidate aria-label="Search hotels"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="row-actions">
        <label className="field">
          <PinIcon />
          <span className="field-body">
            <span className="field-label">Where to?</span>
            <input value={form.destination} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value, destinationPin: null }))}
              placeholder="City, region or hotel" autoComplete="off" enterKeyHint="search" />
          </span>
        </label>
        <button type="button" className={`square-btn${form.destinationPin ? " is-set" : ""}`} aria-label="Choose destination on map"
          aria-haspopup="dialog" onClick={() => setPickerOpen(true)}>
          <MapIcon />
        </button>
      </div>

      <div className="chips" role="group" aria-label="Popular destinations">
        {POPULAR.map((d) => (
          <button type="button" key={d} className="chip" aria-pressed={form.destination === d}
            onClick={() => setForm((p) => ({ ...p, destination: d, destinationPin: null }))}>
            {d.split(",")[0]}
          </button>
        ))}
      </div>

      <div className="two">
        <label className="field">
          <CalendarIcon />
          <span className="field-body">
            <span className="field-label">Check-in</span>
            <input type="date" value={form.checkin} min={today()} onChange={(e) => setCheckin(e.target.value)} />
          </span>
        </label>
        <label className="field">
          <CalendarIcon />
          <span className="field-body">
            <span className="field-label">Check-out</span>
            <input type="date" value={form.checkout} min={form.checkin ? addDays(form.checkin, 1) : today()}
              onChange={(e) => set("checkout", e.target.value)} />
          </span>
        </label>
      </div>

      <div className="row-actions">
        <button type="button" className="field field-btn" aria-expanded={guestsOpen}
          onClick={() => setGuestsOpen((o) => !o)}>
          <UsersIcon />
          <span className="field-body">
            <span className="field-label">Guests &amp; rooms</span>
            <span className="field-value">{plural(guests, "guest")} · {plural(form.rooms, "room")}</span>
          </span>
          <ChevronIcon className={`chev${guestsOpen ? " open" : ""}`} />
        </button>
        <button type="button" className="square-btn" aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`}
          aria-haspopup="dialog" onClick={onOpenFilters}>
          <SlidersIcon />
          {filterCount > 0 && <b className="dot-badge" aria-hidden="true">{filterCount}</b>}
        </button>
      </div>

      {guestsOpen && (
        <div className="guest-panel">
          <Stepper label="Rooms" value={form.rooms} min={1} max={10} onChange={(v) => set("rooms", v)} />
          <Stepper label="Adults" value={form.adults} min={1} max={30} onChange={(v) => set("adults", v)} />
          <Stepper label="Children" value={form.children} min={0} max={10} onChange={setChildren} />
          {ages.length > 0 && (
            <div className="two ages">
              {ages.map((a, i) => (
                <label className="plain-field" key={i}>
                  <span>Child {i + 1} age</span>
                  <input type="number" inputMode="numeric" min="0" max="17" value={a}
                    onChange={(e) => setAges((x) => x.map((v, j) => (j === i ? Math.min(17, Math.max(0, Number(e.target.value) || 0)) : v)))} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="notice err" role="alert">{error}</div>}

      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
        <SearchIcon />
        {loading ? "Searching…" : "Search stays"}
      </button>
    </form>

    <LocationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} kind="place" title="Choose destination"
      initial={form.destinationPin} hint={form.destination}
      onConfirm={(place) => setForm((p) => ({
        ...p, destinationPin: place,
        destination: place.city ? [place.city, place.country].filter(Boolean).join(", ") : place.label,
      }))} />
    </>
  );
}
