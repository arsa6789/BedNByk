// Server route for car-rental search. Holds NOTTE_API_KEY (via lib/server/notte.js) and calls the
// "Rentalcars.com Car Rental Search" Anything API function. The browser only ever talks to this route.
//
// Response contract (always JSON, always this shape):
//   { success: boolean, vehicles: Vehicle[], search_metadata: object | null, error: { code, message } | null }
import {
  CORS, NotteError, clientIp, createLimiter, findObject, runNotteFunction,
} from "../../../../lib/server/notte";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FUNCTION_ID = "527ffa59-a927-4afb-be04-ae6e260288b2"; // Rentalcars.com Car Rental Search
const limited = createLimiter(6, 60_000); // separate bucket from hotel search

const respond = (body, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (status, code, message) =>
  respond({ success: false, vehicles: [], search_metadata: null, error: { code, message } }, status);

// ---------- input validation / normalisation ----------
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const place = (v, max = 100) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
const CURRENCIES = new Set(["GBP", "USD", "EUR", "PKR"]); // verified against the function

function normalise(b) {
  if (!b || typeof b !== "object") return { error: "Invalid request." };
  const pickup_location = place(b.pickup_location);
  if (!pickup_location) return { error: "Please enter a pickup location." };
  if (!isDate(b.pickup_date) || !isDate(b.dropoff_date)) return { error: "Please choose a pickup and return date." };
  const pickup_time = b.pickup_time ?? "10:00";
  const dropoff_time = b.dropoff_time ?? "10:00";
  if (!isTime(pickup_time) || !isTime(dropoff_time)) return { error: "Please choose valid pickup and return times." };
  if (`${b.dropoff_date}T${dropoff_time}` <= `${b.pickup_date}T${pickup_time}`) {
    return { error: "The return date and time must be after the pickup date and time." };
  }
  const age = Number(b.driver_age ?? 30);
  if (!Number.isInteger(age) || age < 18 || age > 99) return { error: "Driver age must be between 18 and 99." };
  const page = Number(b.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 20) return { error: "Invalid page number." };
  const currency = String(b.currency ?? "USD").toUpperCase();
  if (!CURRENCIES.has(currency)) return { error: "That currency isn’t supported for car rentals." };

  return {
    value: {
      pickup_location,
      dropoff_location: place(b.dropoff_location), // empty = return to the pickup location
      pickup_date: b.pickup_date,
      pickup_time,
      dropoff_date: b.dropoff_date,
      dropoff_time,
      driver_age: age,
      currency,
      page,
    },
  };
}

// ---------- response mapping (whitelist: only fields the function documents are passed on) ----------
const https = (u) => (typeof u === "string" && /^https:\/\//.test(u) && u.length < 4000 ? u : null);
const str = (v, max = 1000) => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v) => (typeof v === "boolean" ? v : null);

function mapVehicle(v) {
  return {
    vehicle_id: str(v.vehicle_id, 100),
    vehicle_name: str(v.vehicle_name, 200),
    vehicle_category: str(v.vehicle_category, 100),
    acriss_code: str(v.acriss_code, 10),
    image_url: https(v.image_url),
    supplier_name: str(v.supplier_name, 100),
    supplier_rating: num(v.supplier_rating),
    pickup_desk_type: str(v.pickup_desk_type, 100),
    price_per_day: num(v.price_per_day),
    total_price: num(v.total_price),
    currency: str(v.currency, 3),
    pay_when: str(v.pay_when, 60),
    transmission: str(v.transmission, 60),
    passenger_capacity: num(v.passenger_capacity),
    doors: num(v.doors),
    luggage_capacity: num(v.luggage_capacity),
    large_suitcases: num(v.large_suitcases),
    small_suitcases: num(v.small_suitcases),
    air_conditioning: bool(v.air_conditioning),
    fuel_policy: str(v.fuel_policy),
    mileage_policy: str(v.mileage_policy),
    insurance_information: str(v.insurance_information),
    cancellation_policy: str(v.cancellation_policy),
    free_cancellation: bool(v.free_cancellation),
    booking_url: https(v.booking_url),
  };
}

function mapMeta(m) {
  if (!m || typeof m !== "object") return null;
  return {
    pickup_location: str(m.pickup_location, 200),
    dropoff_location: str(m.dropoff_location, 200),
    pickup_date: str(m.pickup_date, 10),
    pickup_time: str(m.pickup_time, 5),
    dropoff_date: str(m.dropoff_date, 10),
    dropoff_time: str(m.dropoff_time, 5),
    driver_age: num(m.driver_age),
    currency: str(m.currency, 3),
    page: num(m.page),
    page_size: num(m.page_size),
    results_count: num(m.results_count),
    total_available: num(m.total_available),
    pageable_results: num(m.pageable_results),
    rental_days: num(m.rental_days),
    search_url: https(m.search_url),
  };
}

// ---------- handlers ----------
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  if (limited(clientIp(request))) {
    return fail(429, "rate_limited", "Too many searches. Please wait a minute and try again.");
  }

  let body;
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const { value, error } = normalise(body);
  if (error) return fail(400, "bad_request", error);

  let data;
  try {
    data = await runNotteFunction(FUNCTION_ID, value);
  } catch (e) {
    if (e instanceof NotteError) return fail(e.status, e.code, e.message);
    return fail(502, "upstream_error", "The search service is unavailable.");
  }

  // The function reports problems (unknown location, bad dates, no cars, WAF block) in `error`, not as an exception.
  const result = findObject(data, (o) => Array.isArray(o.vehicles) && "error" in o);
  if (!result) return fail(502, "unexpected_response", "The search service returned an unexpected response.");

  if (result.error) {
    const e = result.error;
    return respond({
      success: false,
      vehicles: [],
      search_metadata: mapMeta(result.search_metadata),
      error: { code: str(e.code, 60) || "search_failed", message: str(e.message, 300) || "The search failed." },
    });
  }

  return respond({
    success: true,
    vehicles: result.vehicles.filter((v) => v && typeof v === "object").map(mapVehicle),
    search_metadata: mapMeta(result.search_metadata),
    error: null,
  });
}
