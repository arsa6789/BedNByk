// Server route for bike/scooter/motorcycle rental search ("BikesBooking Rental Bike Search" function).
// Holds NOTTE_API_KEY via lib/server/notte.js; the browser only talks to this route.
//
// Response (always JSON): { success, bikes: Bike[], search_metadata: object | null, error: { code, message } | null }
import { CORS, NotteError, clientIp, createLimiter, findObject, runNotteFunction } from "../../../../lib/server/notte";
import { isDate, isTime, place, optNumber, https, str, num } from "../../../../lib/server/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FUNCTION_ID = "53d4138a-ddef-44ca-acb4-4f7942acd0cf"; // search_rental_bikes
const limited = createLimiter(10, 60_000); // separate bucket; this function is fast (2-4 s)
const PER_PAGE = 20;

// Values the function accepts (taken from its own INVALID_INPUT message) and its documented currencies.
const BIKE_TYPES = new Set(["bicycle", "e-bike", "scooter", "moped", "motorcycle", "touring bike", "adventure bike", "cruiser", "quad bike"]);
const CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF", "RUB"]);
const TRANSMISSIONS = new Set(["automatic", "manual"]);

const respond = (body, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (status, code, message) =>
  respond({ success: false, bikes: [], search_metadata: null, error: { code, message } }, status);

function normalise(b) {
  if (!b || typeof b !== "object") return { error: "Invalid request." };
  const destination = place(b.destination);
  if (!destination) return { error: "Please enter a destination." };
  if (!isDate(b.pickup_date) || !isDate(b.return_date)) return { error: "Please choose a pickup and return date." };
  if (b.return_date <= b.pickup_date) return { error: "The return date must be after the pickup date." };
  const pickup_time = b.pickup_time ?? "10:00";
  const return_time = b.return_time ?? "10:00";
  if (!isTime(pickup_time) || !isTime(return_time)) return { error: "Please choose valid pickup and return times." };
  const currency = String(b.currency ?? "EUR").toUpperCase();
  if (!CURRENCIES.has(currency)) return { error: "That currency isn’t supported for bike rentals." };
  const page = Number(b.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 200) return { error: "Invalid page number." };

  const bike_type = String(b.bike_type ?? "").toLowerCase();
  if (bike_type && !BIKE_TYPES.has(bike_type)) return { error: "Unknown bike type." };
  const transmission = String(b.transmission ?? "").toLowerCase();
  if (transmission && !TRANSMISSIONS.has(transmission)) return { error: "Unknown transmission." };
  const min_price = optNumber(b.min_price, { max: 100000 });
  const max_price = optNumber(b.max_price, { max: 100000 });
  const min_engine_capacity = optNumber(b.min_engine_capacity, { max: 5000, integer: true });
  const max_engine_capacity = optNumber(b.max_engine_capacity, { max: 5000, integer: true });
  if ([min_price, max_price, min_engine_capacity, max_engine_capacity].includes(undefined)) {
    return { error: "Please check the price and engine size filters." };
  }
  if (min_price != null && max_price != null && min_price > max_price) return { error: "Minimum price can’t be higher than the maximum." };
  if (min_engine_capacity != null && max_engine_capacity != null && min_engine_capacity > max_engine_capacity) {
    return { error: "Minimum engine size can’t be higher than the maximum." };
  }

  return {
    value: {
      destination, pickup_date: b.pickup_date, return_date: b.return_date, pickup_time, return_time,
      currency, page, results_per_page: PER_PAGE, bike_type, transmission,
      min_price, max_price, min_engine_capacity, max_engine_capacity,
    },
  };
}

function mapBike(v) {
  return {
    bike_id: str(v.bike_id, 20),
    name: str(v.name, 200),
    url: https(v.url),
    image_url: https(v.image_url),
    rental_company: str(v.rental_company, 200),
    rental_company_rating: num(v.rental_company_rating),
    price_per_day: num(v.price_per_day),
    total_price: num(v.total_price),
    currency: str(v.currency, 3),
    bike_type: str(v.bike_type, 60),
    engine_capacity: num(v.engine_capacity),
    transmission: str(v.transmission, 60),
    included_mileage: str(v.included_mileage, 200),
    deposit: str(v.deposit, 200),
    insurance_information: str(v.insurance_information, 500),
    pickup_location: str(v.pickup_location, 300),
    required_license: str(v.required_license, 200),
    minimum_rider_age: num(v.minimum_rider_age),
    cancellation_policy: str(v.cancellation_policy, 500),
    booking_url: https(v.booking_url),
  };
}

function mapMeta(m) {
  if (!m || typeof m !== "object") return null;
  return {
    destination: str(m.destination, 100),
    resolved_location: str(m.resolved_location, 200),
    pickup_date: str(m.pickup_date, 10),
    return_date: str(m.return_date, 10),
    pickup_time: str(m.pickup_time, 5),
    return_time: str(m.return_time, 5),
    rental_days: num(m.rental_days),
    currency: str(m.currency, 3),
    page: num(m.page),
    results_per_page: num(m.results_per_page),
    results_count: num(m.results_count),
    total_matching: num(m.total_matching),
    total_available_before_filters: num(m.total_available_before_filters),
    total_pages: num(m.total_pages),
    search_url: https(m.search_url),
  };
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  if (limited(clientIp(request))) return fail(429, "rate_limited", "Too many searches. Please wait a minute and try again.");

  let body;
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const { value, error } = normalise(body);
  if (error) return fail(400, "bad_request", error);

  let data;
  try {
    data = await runNotteFunction(FUNCTION_ID, value, 35_000);
  } catch (e) {
    if (e instanceof NotteError) return fail(e.status, e.code, e.message);
    return fail(502, "upstream_error", "The search service is unavailable.");
  }

  // The function reports problems (unknown city, bad dates, no bikes) in `error`, not as an exception.
  const result = findObject(data, (o) => Array.isArray(o.bikes) && "error" in o);
  if (!result) return fail(502, "unexpected_response", "The search service returned an unexpected response.");

  if (result.error) {
    const e = result.error;
    return respond({
      success: false,
      bikes: [],
      search_metadata: mapMeta(result.search_metadata),
      error: { code: str(e.error_code ?? e.code, 60) || "search_failed", message: str(e.message, 300) || "The search failed." },
    });
  }

  return respond({
    success: true,
    bikes: result.bikes.filter((v) => v && typeof v === "object").map(mapBike),
    search_metadata: mapMeta(result.search_metadata),
    error: null,
  });
}
