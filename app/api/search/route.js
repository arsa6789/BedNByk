// Server-side route: holds NOTTE_API_KEY and calls the Anything API function.
// The browser/app only ever talks to THIS route, never to Notte directly.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FUNCTION_ID = "69608f5f-9247-4d53-8ad6-5188a7d4a8fd"; // Booking.com Hotel Search
const MCP_URL = "https://anything.notte.cc/mcp";

// '*' is fine here: no cookies/credentials are used, and the Capacitor app has its own origin.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body, status = 200) => Response.json(body, { status, headers: cors });

// Best-effort rate limit (in-memory; serverless instances don't share it).
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 6;
}

const int = (v, min, max, d) => Math.min(max, Math.max(min, Number.isFinite(+v) ? Math.trunc(+v) : d));
const num = (v) => (v === null || v === "" || v === undefined || !Number.isFinite(+v) ? null : +v);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function findResult(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 6) return null;
  if (Array.isArray(o.properties) && "success" in o) return o;
  for (const k of Object.keys(o)) {
    const r = findResult(o[k], depth + 1);
    if (r) return r;
  }
  return null;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(request) {
  const key = process.env.NOTTE_API_KEY;
  if (!key) return json({ error: "server_not_configured" }, 500);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  let b;
  try { b = await request.json(); } catch { return json({ error: "bad_request" }, 400); }

  const destination = typeof b.destination === "string" ? b.destination.trim().slice(0, 100) : "";
  if (!destination || !isDate(b.checkin_date) || !isDate(b.checkout_date) || b.checkout_date <= b.checkin_date) {
    return json({ error: "bad_request" }, 400);
  }

  const children = int(b.children, 0, 10, 0);
  const stars = Array.isArray(b.star_rating)
    ? b.star_rating.map((n) => int(n, 1, 5, 0)).filter(Boolean)
    : null;

  const variables = {
    destination,
    checkin_date: b.checkin_date,
    checkout_date: b.checkout_date,
    adults: int(b.adults, 1, 30, 2),
    children,
    rooms: int(b.rooms, 1, 10, 1),
    currency: /^[A-Z]{3}$/.test(b.currency) ? b.currency : "USD",
    page: int(b.page, 1, 50, 1),
    min_price: num(b.min_price),
    max_price: num(b.max_price),
    star_rating: stars && stars.length ? stars : null,
    free_cancellation: b.free_cancellation === true,
    children_ages: children && Array.isArray(b.children_ages)
      ? b.children_ages.slice(0, children).map((n) => int(n, 0, 17, 8))
      : null,
  };

  const client = new Client({ name: "stayfinder", version: "1.0.0" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(MCP_URL), {
        requestInit: { headers: { Authorization: `Bearer ${key}` } },
      })
    );
    const r = await client.callTool(
      { name: "run", arguments: { function_id: FUNCTION_ID, variables } },
      undefined,
      { timeout: 55_000 }
    );
    if (r.isError) return json({ error: "upstream_error" }, 502);

    let data = r.structuredContent;
    if (!data) {
      const text = r.content?.find((c) => c.type === "text")?.text;
      try { data = JSON.parse(text); } catch { data = null; }
    }
    const result = findResult(data);
    if (!result) return json({ error: "unexpected_response" }, 502);
    return json(result);
  } catch (e) {
    const msg = String(e?.message || "");
    if (/401|403|unauthor/i.test(msg)) return json({ error: "bad_api_key" }, 502);
    if (/timeout|timed out/i.test(msg)) return json({ error: "timeout" }, 504);
    return json({ error: "upstream_error" }, 502);
  } finally {
    client.close().catch(() => {});
  }
}
