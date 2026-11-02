"use client";
import { useState } from "react";
import LocationPicker from "./LocationPicker";
import { PinIcon, CarIcon } from "./Icons";
import { applyCarPin } from "../lib/cars";

// Home card: set a car pick-up and drop-off with map pins, then jump straight to the car results.
export default function TripPlanner({ form, setForm, onFind, near, loading }) {
  const [picker, setPicker] = useState(null); // null | "pickup" | "dropoff"
  const different = form.differentDropoff && form.dropoff;

  return (
    <section className="planner" aria-labelledby="planner-title">
      <div className="planner-head">
        <span className="empty-icon" aria-hidden="true"><CarIcon width={22} height={22} /></span>
        <div>
          <h2 id="planner-title">Plan a car trip</h2>
          <p className="muted small">Drop pins for where you collect and return the car.</p>
        </div>
      </div>

      <button type="button" className="field field-btn" onClick={() => setPicker("pickup")} aria-haspopup="dialog">
        <span className="pin-dot a" aria-hidden="true">A</span>
        <span className="field-body">
          <span className="field-label">Pick-up</span>
          <span className="field-value">{form.pickup || "Choose on map"}</span>
        </span>
        <PinIcon />
      </button>
      <button type="button" className="field field-btn" onClick={() => setPicker("dropoff")} aria-haspopup="dialog">
        <span className="pin-dot b" aria-hidden="true">B</span>
        <span className="field-body">
          <span className="field-label">Drop-off</span>
          <span className="field-value">{different ? form.dropoff : "Same as pick-up"}</span>
        </span>
        <PinIcon />
      </button>
      {different && (
        <button type="button" className="link-btn planner-reset"
          onClick={() => setForm((p) => ({ ...p, differentDropoff: false, dropoff: "", dropoffPin: null }))}>
          Return to the pick-up point instead
        </button>
      )}

      <button type="button" className="btn btn-primary btn-lg" disabled={!form.pickup.trim() || loading} onClick={onFind}>
        {loading ? "Searching…" : "Find cars"}
      </button>

      <LocationPicker open={picker !== null} onClose={() => setPicker(null)} kind={picker || "pickup"}
        title={picker === "dropoff" ? "Drop-off point" : "Pick-up point"} near={near}
        initial={picker === "dropoff" ? form.dropoffPin : form.pickupPin}
        hint={picker === "dropoff" ? (form.dropoff || "") : (form.pickup || "")}
        onConfirm={(place) => setForm((p) => applyCarPin(p, picker || "pickup", place))} />
    </section>
  );
}
