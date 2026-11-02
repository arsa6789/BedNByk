// Car-rental helpers: defaults, validation, request payload, client-side filtering/sorting, formatters.
// Request keys match app/api/cars/search/route.js, which mirrors the Rentalcars function's real parameters.
import { addDays, today } from "./search";

export const CAR_CURRENCIES = ["USD", "EUR", "GBP", "PKR"]; // the currencies the function was verified with
export const CAR_POPULAR = ["London Heathrow Airport", "Dubai International Airport", "Paris Charles de Gaulle Airport", "Istanbul Airport", "Barcelona Airport"];
export const SEAT_OPTIONS = [{ value: 0, label: "Any" }, { value: 4, label: "4+" }, { value: 5, label: "5+" }, { value: 7, label: "7+" }];

// 00:00 … 23:30 in 30-minute steps
export const TIMES = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export const DEFAULT_CAR_FORM = {
  pickup: "",
  differentDropoff: false,
  dropoff: "",
  pickupDate: "",
  pickupTime: "10:00",
  dropoffDate: "",
  dropoffTime: "10:00",
  driverAge: 30,
  currency: "USD",
  pickupPin: null,  // { lat, lng, label, city } when chosen on the map
  dropoffPin: null,
};

// Client-side filters. The function has no server-side filters, so these only narrow what came back.
export const DEFAULT_CAR_FILTERS = {
  transmission: "", category: "", seats: 0, maxTotal: "", freeCancellation: false, airCon: false,
};

export function defaultCarDates() {
  return { pickupDate: addDays(today(), 30), dropoffDate: addDays(today(), 33) };
}

export function validateCar(f) {
  if (!f.pickup.trim()) return "Please enter a pickup location.";
  if (f.differentDropoff && !f.dropoff.trim()) return "Enter a return location or switch off “Return to a different location”.";
  if (!f.pickupDate || !f.dropoffDate) return "Please choose pickup and return dates.";
  if (f.pickupDate < today()) return "Pickup can’t be in the past.";
  if (`${f.dropoffDate}T${f.dropoffTime}` <= `${f.pickupDate}T${f.pickupTime}`) return "Return must be after pickup.";
  const age = Number(f.driverAge);
  if (!Number.isInteger(age) || age < 18 || age > 99) return "Driver age must be between 18 and 99.";
  return "";
}

export function buildCarPayload(f, page = 1) {
  return {
    pickup_location: f.pickup.trim(),
    dropoff_location: f.differentDropoff ? f.dropoff.trim() : "",
    pickup_date: f.pickupDate,
    pickup_time: f.pickupTime,
    dropoff_date: f.dropoffDate,
    dropoff_time: f.dropoffTime,
    driver_age: Number(f.driverAge),
    currency: f.currency,
    page,
  };
}

export const countCarFilters = (f) =>
  [f.transmission, f.category, f.seats, f.maxTotal !== "", f.freeCancellation, f.airCon].filter(Boolean).length;

export function applyCarFilters(list, f) {
  const max = f.maxTotal === "" ? null : Number(f.maxTotal);
  return list.filter((v) =>
    (!f.transmission || v.transmission === f.transmission) &&
    (!f.category || v.vehicle_category === f.category) &&
    (!f.seats || (v.passenger_capacity ?? 0) >= f.seats) &&
    (max == null || (v.total_price != null && v.total_price <= max)) &&
    (!f.freeCancellation || v.free_cancellation === true) &&
    (!f.airCon || v.air_conditioning === true));
}

export function sortCars(list, sort) {
  const out = [...list];
  if (sort === "price") out.sort((a, b) => (a.total_price ?? Infinity) - (b.total_price ?? Infinity));
  if (sort === "rating") out.sort((a, b) => (b.supplier_rating ?? -1) - (a.supplier_rating ?? -1));
  return out;
}

// Distinct non-empty values of a field in the returned vehicles (for filter options).
export const distinct = (list, key) => [...new Set(list.map((v) => v[key]).filter(Boolean))].sort();

// "PAY_NOW" -> "Pay now"
export const humanize = (s) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : null);

export const moneyExact = (n, currency) => {
  if (n == null) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency || ""}`.trim();
  }
};

export const fmtTime = (hhmm) => hhmm || "";

// Put a place chosen on the map into the car form. The booking site only accepts a place name, so the text field
// gets the pin's name; the pin itself is kept for the results map.
export function applyCarPin(form, which, place) {
  return which === "pickup"
    ? { ...form, pickup: place.label, pickupPin: place }
    : { ...form, differentDropoff: true, dropoff: place.label, dropoffPin: place };
}
