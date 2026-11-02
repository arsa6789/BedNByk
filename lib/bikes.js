// Bike-rental helpers. Request keys match app/api/bikes/search/route.js, which mirrors the
// BikesBooking function's real parameters. Unlike cars, this function filters on the server.
import { addDays, today } from "./search";

export const BIKE_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "RUB"]; // documented by the function
// Verified live: these cities return bikes.
export const BIKE_POPULAR = ["Barcelona", "Rome", "Lisbon", "Amsterdam", "Athens"];
// Exactly the values the function accepts (from its own INVALID_INPUT message).
export const BIKE_TYPES = [
  { value: "", label: "Any" },
  { value: "bicycle", label: "Bicycle" },
  { value: "e-bike", label: "E-bike" },
  { value: "scooter", label: "Scooter" },
  { value: "moped", label: "Moped" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "touring bike", label: "Touring" },
  { value: "adventure bike", label: "Adventure" },
  { value: "cruiser", label: "Cruiser" },
  { value: "quad bike", label: "Quad" },
];
export const TRANSMISSION_OPTIONS = [
  { value: "", label: "Any" }, { value: "automatic", label: "Automatic" }, { value: "manual", label: "Manual" },
];

export const DEFAULT_BIKE_FORM = {
  destination: "", pickupDate: "", pickupTime: "10:00", returnDate: "", returnTime: "10:00", currency: "EUR",
  destinationPin: null, // { lat, lng, label, city } when chosen on the map
};
// Server-side filters (sent with the search).
export const DEFAULT_BIKE_FILTERS = {
  bikeType: "", transmission: "", minPrice: "", maxPrice: "", minEngine: "", maxEngine: "",
};

export const defaultBikeDates = () => ({ pickupDate: addDays(today(), 30), returnDate: addDays(today(), 33) });

const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

export function validateBike(f, flt) {
  if (!f.destination.trim()) return "Please enter a city.";
  if (!f.pickupDate || !f.returnDate) return "Please choose pickup and return dates.";
  if (f.pickupDate < today()) return "Pickup can’t be in the past.";
  if (f.returnDate <= f.pickupDate) return "Return date must be after the pickup date.";
  const [a, b, c, d] = [flt.minPrice, flt.maxPrice, flt.minEngine, flt.maxEngine].map(numOrNull);
  if ([a, b, c, d].some((n) => n != null && (!Number.isFinite(n) || n < 0))) return "Filter values must be positive numbers.";
  if (a != null && b != null && a > b) return "Minimum price can’t be higher than the maximum.";
  if (c != null && d != null && c > d) return "Minimum engine size can’t be higher than the maximum.";
  return "";
}

export function buildBikePayload(f, flt, page = 1) {
  return {
    destination: f.destination.trim(),
    pickup_date: f.pickupDate, pickup_time: f.pickupTime,
    return_date: f.returnDate, return_time: f.returnTime,
    currency: f.currency, page,
    bike_type: flt.bikeType, transmission: flt.transmission,
    min_price: numOrNull(flt.minPrice), max_price: numOrNull(flt.maxPrice),
    min_engine_capacity: numOrNull(flt.minEngine), max_engine_capacity: numOrNull(flt.maxEngine),
  };
}

export const countBikeFilters = (flt) => Object.values(flt).filter((v) => v !== "").length;

// Client-side sort of the loaded page(s) only; the function itself has no sort option.
export function sortBikes(list, sort) {
  const out = [...list];
  if (sort === "price") out.sort((a, b) => (a.total_price ?? Infinity) - (b.total_price ?? Infinity));
  if (sort === "rating") out.sort((a, b) => (b.rental_company_rating ?? -1) - (a.rental_company_rating ?? -1));
  return out;
}

export const isFreeCancel = (b) => /free cancellation/i.test(b.cancellation_policy || "");
