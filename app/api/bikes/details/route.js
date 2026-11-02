// Server route for one bike's full details + booking link ("BikesBooking Bike Details" function).
// Response (always JSON): { success, bike: BikeDetails | null, error: { code, message } | null }
import { CORS, NotteError, clientIp, createLimiter, findObject, runNotteFunction } from "../../../../lib/server/notte";
import { isDate, isTime, place, https, str, num, bool } from "../../../../lib/server/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FUNCTION_ID = "abd95083-df91-444c-9bd4-0a823043fe55"; // get_bike_rental_details
const limited = createLimiter(20, 60_000);
const CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF", "RUB"]);

const respond = (body, status = 200) => Response.json(body, { status, headers: CORS });
const fail = (status, code, message) => respond({ success: false, bike: null, error: { code, message } }, status);

function normalise(b) {
  if (!b || typeof b !== "object") return { error: "Invalid request." };
  const bike = String(b.bike_id ?? "").trim();
  if (!/^\d{1,10}$/.test(bike)) return { error: "Invalid bike." }; // numeric ids only (no URLs accepted)
  if (!isDate(b.pickup_date) || !isDate(b.return_date)) return { error: "Please choose a pickup and return date." };
  if (b.return_date <= b.pickup_date) return { error: "The return date must be after the pickup date." };
  const pickup_time = b.pickup_time ?? "10:00";
  const return_time = b.return_time ?? "10:00";
  if (!isTime(pickup_time) || !isTime(return_time)) return { error: "Please choose valid pickup and return times." };
  const currency = String(b.currency ?? "EUR").toUpperCase();
  if (!CURRENCIES.has(currency)) return { error: "That currency isn’t supported for bike rentals." };
  return {
    value: {
      bike, destination: place(b.destination), pickup_date: b.pickup_date, return_date: b.return_date,
      pickup_time, return_time, currency,
    },
  };
}

const strList = (a, maxItems, maxLen) =>
  Array.isArray(a) ? a.filter((x) => typeof x === "string" && x.trim()).slice(0, maxItems).map((x) => x.slice(0, maxLen)) : [];

function mapDetails(v) {
  return {
    bike_id: str(v.bike_id, 20),
    name: str(v.name, 200),
    description: str(v.description, 3000),
    images: strList(v.images, 12, 4000).filter((u) => https(u)),
    bike_type: str(v.bike_type, 60),
    engine_capacity: num(v.engine_capacity),
    transmission: str(v.transmission, 60),
    fuel_type: str(v.fuel_type, 60),
    passenger_capacity: num(v.passenger_capacity),
    rental_company: str(v.rental_company, 200),
    rental_company_rating: num(v.rental_company_rating),
    rental_company_terms: str(v.rental_company_terms, 4000),
    opening_hours: str(v.opening_hours, 500),
    booking_mode: str(v.booking_mode, 60),
    payment_methods: str(v.payment_methods, 300),
    pickup_location: str(v.pickup_location, 300),
    pickup_city: str(v.pickup_city, 100),
    latitude: num(v.latitude),
    longitude: num(v.longitude),
    pickup_date: str(v.pickup_date, 10),
    return_date: str(v.return_date, 10),
    pickup_time: str(v.pickup_time, 5),
    return_time: str(v.return_time, 5),
    rental_days: num(v.rental_days),
    available_units: num(v.available_units),
    price_per_day: num(v.price_per_day),
    total_price: num(v.total_price),
    pay_now: num(v.pay_now),
    pay_on_arrival: num(v.pay_on_arrival),
    currency: str(v.currency, 3),
    included_mileage: str(v.included_mileage, 200),
    deposit: str(v.deposit, 200),
    insurance_information: str(v.insurance_information, 1500),
    required_license: str(v.required_license, 200),
    minimum_rider_age: num(v.minimum_rider_age),
    included_equipment: strList(v.included_equipment, 30, 200),
    optional_extras: (Array.isArray(v.optional_extras) ? v.optional_extras : []).slice(0, 30)
      .filter((x) => x && typeof x === "object" && typeof x.name === "string")
      .map((x) => ({ name: x.name.slice(0, 200), price: num(x.price), currency: str(x.currency, 3), per_day: bool(x.per_day), free: bool(x.free) })),
    cancellation_policy: str(v.cancellation_policy, 1500),
    url: https(v.url),
    booking_url: https(v.booking_url),
  };
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  if (limited(clientIp(request))) return fail(429, "rate_limited", "Too many requests. Please wait a minute and try again.");

  let body;
  try { body = await request.json(); } catch { return fail(400, "bad_request", "Invalid request."); }
  const { value, error } = normalise(body);
  if (error) return fail(400, "bad_request", error);

  let data;
  try {
    data = await runNotteFunction(FUNCTION_ID, value, 35_000);
  } catch (e) {
    if (e instanceof NotteError) return fail(e.status, e.code, e.message);
    return fail(502, "upstream_error", "The details service is unavailable.");
  }

  const result = findObject(data, (o) => "bike" in o && "error" in o);
  if (!result) return fail(502, "unexpected_response", "The details service returned an unexpected response.");

  if (result.error || !result.bike || typeof result.bike !== "object") {
    const e = result.error || {};
    return respond({
      success: false, bike: null,
      error: { code: str(e.error_code ?? e.code, 60) || "details_failed", message: str(e.message, 300) || "Couldn’t load this bike’s details." },
    });
  }
  return respond({ success: true, bike: mapDetails(result.bike), error: null });
}
