// History helpers (pure). Storage + React live in useHistory.js.
import { addDays, today, fmtDate, plural } from "./search";

export const MODE_LABEL = { hotels: "Stays", cars: "Cars", bikes: "Bikes" };

const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86_400_000);

// Old searches often have dates that have already passed. Move the trip forward, keeping its length.
function shift(start, end) {
  if (!start || !end || start >= today()) return { start, end };
  const len = Math.max(1, dayDiff(start, end));
  const s = addDays(today(), 30);
  return { start: s, end: addDays(s, len) };
}

export function refreshSnapshot(mode, snap) {
  if (mode === "hotels") {
    const { start, end } = shift(snap.form.checkin, snap.form.checkout);
    return { ...snap, form: { ...snap.form, checkin: start, checkout: end } };
  }
  if (mode === "cars") {
    const { start, end } = shift(snap.form.pickupDate, snap.form.dropoffDate);
    return { ...snap, form: { ...snap.form, pickupDate: start, dropoffDate: end } };
  }
  const { start, end } = shift(snap.form.pickupDate, snap.form.returnDate);
  return { ...snap, form: { ...snap.form, pickupDate: start, returnDate: end } };
}

// Short title/subtitle shown on history and "continue" cards.
export function describeSearch(mode, snap) {
  const f = snap.form;
  const range = (a, b) => (a && b ? `${fmtDate(a)} – ${fmtDate(b)}` : "");
  if (mode === "hotels") {
    return { title: f.destination, subtitle: [range(f.checkin, f.checkout), plural(f.adults + f.children, "guest")].filter(Boolean).join(" · ") };
  }
  if (mode === "cars") {
    return { title: f.pickup, subtitle: [range(f.pickupDate, f.dropoffDate), f.differentDropoff && f.dropoff ? `to ${f.dropoff}` : ""].filter(Boolean).join(" · ") };
  }
  return { title: f.destination, subtitle: [range(f.pickupDate, f.returnDate), snap.filters?.bikeType].filter(Boolean).join(" · ") };
}

export function timeAgo(ts, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ts) / 60_000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}
