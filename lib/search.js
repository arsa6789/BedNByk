// Shared helpers for the search form, filters and request payload.
// The payload keys below are exactly what app/api/search/route.js already validates.

export const CURRENCIES = ["USD", "EUR", "GBP", "PKR", "AED"];
export const POPULAR = ["Paris, France", "Dubai, UAE", "Istanbul, Turkey", "London, UK", "Bangkok, Thailand"];
export const STAR_OPTIONS = [
  { value: "", label: "Any" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5 only" },
];

export const DEFAULT_FORM = {
  destination: "",
  checkin: "",
  checkout: "",
  adults: 2,
  children: 0,
  rooms: 1,
  currency: "USD",
  minPrice: "",
  maxPrice: "",
  stars: "",
  freeCancellation: false,
  destinationPin: null, // { lat, lng, label, city } when chosen on the map
};

const pad = (n) => String(n).padStart(2, "0");
// Local-time YYYY-MM-DD (toISOString would use UTC and can be off by a day).
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (iso, n) => {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const today = () => toISO(new Date());

export const plural = (n, word, many) => `${n} ${n === 1 ? word : many || word + "s"}`;
export const fmtDate = (iso, opts = { month: "short", day: "numeric" }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, opts);

export function validate(f) {
  if (!f.destination.trim()) return "Please enter a destination.";
  if (!f.checkin || !f.checkout) return "Please choose both dates.";
  if (f.checkin < today()) return "Check-in can’t be in the past.";
  if (f.checkout <= f.checkin) return "Check-out must be after check-in.";
  if (f.minPrice !== "" && f.maxPrice !== "" && Number(f.minPrice) > Number(f.maxPrice)) {
    return "Minimum price can’t be higher than the maximum.";
  }
  return "";
}

export function buildPayload(f, ages) {
  const min = Number(f.stars);
  return {
    destination: f.destination.trim(),
    checkin_date: f.checkin,
    checkout_date: f.checkout,
    adults: f.adults,
    children: f.children,
    rooms: f.rooms,
    currency: f.currency,
    min_price: f.minPrice === "" ? null : Number(f.minPrice),
    max_price: f.maxPrice === "" ? null : Number(f.maxPrice),
    star_rating: min ? [3, 4, 5].filter((n) => (min === 5 ? n === 5 : n >= min)) : null,
    free_cancellation: f.freeCancellation,
    children_ages: f.children ? ages.slice(0, f.children) : null,
  };
}

// How many server-side filters are switched on (for badges).
export function activeFilterCount(f) {
  return [f.minPrice !== "", f.maxPrice !== "", f.stars !== "", f.freeCancellation, f.currency !== "USD"].filter(Boolean).length;
}

export const money = (n, currency) => {
  if (n == null) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${Math.round(n)} ${currency || ""}`.trim();
  }
};
