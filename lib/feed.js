// Homepage feed: which cities it shows, and one shared "item" shape so hotels, cars and bikes can
// be rendered by the same cards (carousels, map previews, history) without three copies of the layout.
import { addDays, today, DEFAULT_FORM, buildPayload, money } from "./search";
import { DEFAULT_CAR_FORM, buildCarPayload, moneyExact } from "./cars";
import { DEFAULT_BIKE_FORM, DEFAULT_BIKE_FILTERS, buildBikePayload } from "./bikes";

// Cities verified live with all three services (Barcelona, Rome, Lisbon, Athens).
export const FEED_CITIES = [
  { id: "barcelona", label: "Barcelona", hotel: "Barcelona, Spain", car: "Barcelona Airport", bike: "Barcelona", lat: 41.3874, lng: 2.1686 },
  { id: "rome", label: "Rome", hotel: "Rome, Italy", car: "Rome Fiumicino Airport", bike: "Rome", lat: 41.9028, lng: 12.4964 },
  { id: "lisbon", label: "Lisbon", hotel: "Lisbon, Portugal", car: "Lisbon Airport", bike: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { id: "athens", label: "Athens", hotel: "Athens, Greece", car: "Athens Airport", bike: "Athens", lat: 37.9838, lng: 23.7275 },
];
export const FEED_CURRENCY = "EUR";
export const FEED_LIMIT = 12; // items kept per section (keeps the cache small)
export const FEED_KINDS = ["cars", "bikes", "hotels"]; // order of the sections on the page

export const feedDates = () => ({ start: addDays(today(), 30), end: addDays(today(), 33) });

// Request payloads for the three existing API routes, built with the same helpers the search forms use.
export function feedPayload(kind, city) {
  const { start, end } = feedDates();
  if (kind === "hotels") {
    return buildPayload({ ...DEFAULT_FORM, destination: city.hotel, checkin: start, checkout: end, currency: FEED_CURRENCY }, []);
  }
  if (kind === "cars") {
    return buildCarPayload({ ...DEFAULT_CAR_FORM, pickup: city.car, pickupDate: start, dropoffDate: end, currency: FEED_CURRENCY }, 1);
  }
  return buildBikePayload({ ...DEFAULT_BIKE_FORM, destination: city.bike, pickupDate: start, returnDate: end, currency: FEED_CURRENCY }, DEFAULT_BIKE_FILTERS, 1);
}

const safeUrl = (u) => (/^https:\/\//.test(u || "") ? u : null);
const num = (n) => (typeof n === "number" && Number.isFinite(n) ? n : null);

// ---------- unified item ----------
// { key, kind: "hotel"|"car"|"bike", id, raw, title, subtitle, image, rating, ratingText, price, priceText, priceShort,
//   unit, total, href, tag, lat, lng, address }
export function toItem(kind, raw, ctx = {}) {
  if (kind === "hotel") {
    const room = raw.available_rooms?.[0] || {};
    const cur = raw.currency || room.currency || ctx.currency;
    return {
      key: `hotel:${raw.property_id}`, kind, id: raw.property_id, raw,
      title: raw.name, subtitle: raw.display_location || raw.city || "",
      image: raw.thumbnail || null,
      rating: num(raw.rating_score), ratingText: raw.rating_text || "", reviews: num(raw.reviews_count),
      price: num(raw.price_per_night), priceText: money(raw.price_per_night, cur), priceShort: money(raw.price_per_night, cur),
      unit: "night", total: money(raw.total_price, cur),
      href: safeUrl(room.checkout_url) || safeUrl(raw.booking_url) || safeUrl(raw.url),
      tag: raw.has_free_cancellation ? "Free cancellation" : "",
      lat: num(raw.latitude), lng: num(raw.longitude), address: raw.address || "",
    };
  }
  if (kind === "car") {
    const trip = raw.trip || ctx.trip || {};
    return {
      key: `car:${raw.vehicle_id}`, kind, id: raw.vehicle_id, raw,
      title: raw.vehicle_name || raw.vehicle_category || "Rental car",
      subtitle: [raw.vehicle_category, raw.supplier_name].filter(Boolean).join(" · "),
      image: raw.image_url || null,
      rating: num(raw.supplier_rating), ratingText: "", reviews: null,
      price: num(raw.price_per_day), priceText: moneyExact(raw.price_per_day, raw.currency), priceShort: money(raw.price_per_day, raw.currency),
      unit: "day", total: moneyExact(raw.total_price, raw.currency),
      href: safeUrl(raw.booking_url),
      tag: raw.free_cancellation === true ? "Free cancellation" : "",
      lat: null, lng: null, address: trip.pickup_location || "",
    };
  }
  return {
    key: `bike:${raw.bike_id}`, kind: "bike", id: raw.bike_id, raw,
    title: raw.name || raw.bike_type || "Rental bike",
    subtitle: [raw.bike_type, raw.rental_company].filter(Boolean).join(" · "),
    image: raw.image_url || null,
    rating: num(raw.rental_company_rating), ratingText: "", reviews: null,
    price: num(raw.price_per_day), priceText: moneyExact(raw.price_per_day, raw.currency), priceShort: money(raw.price_per_day, raw.currency),
    unit: "day", total: moneyExact(raw.total_price, raw.currency),
    href: null, // bikes open the details sheet, which holds the booking link
    tag: /free cancellation/i.test(raw.cancellation_policy || "") ? "Free cancellation" : "",
    lat: null, lng: null, address: raw.pickup_location || "",
  };
}

// "Popular / Top rated": best-rated loaded items across all sections (all three score out of 10).
export function topRated(items, limit = 10) {
  return items
    .filter((it) => it.rating != null && it.rating > 0)
    .sort((a, b) => b.rating - a.rating || (b.reviews || 0) - (a.reviews || 0) || (a.price ?? Infinity) - (b.price ?? Infinity))
    .slice(0, limit);
}

export const KIND_LABEL = { hotel: "Stay", car: "Car", bike: "Bike" };
