// Server-only helpers for calling Anything API functions through the Notte MCP endpoint.
// Used by the car-rental route. (The hotel route keeps its own inline copy so its behaviour is untouched.)
// NOTTE_API_KEY is read here on the server and is never sent to the browser or written to logs.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const MCP_URL = "https://anything.notte.cc/mcp";

// '*' is fine: no cookies or credentials are used, and the Capacitor app has its own origin.
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export class NotteError extends Error {
  constructor(code, status, message) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Best-effort per-IP limiter (in-memory; serverless instances don't share it).
export function createLimiter(max, windowMs) {
  const hits = new Map();
  return function limited(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 500) {
      for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    }
    return recent.length > max;
  };
}

export const clientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

// Depth-first search for the object that satisfies `test` (the run result is wrapped a few levels deep).
export function findObject(o, test, depth = 0) {
  if (!o || typeof o !== "object" || depth > 6) return null;
  if (test(o)) return o;
  for (const k of Object.keys(o)) {
    const r = findObject(o[k], test, depth + 1);
    if (r) return r;
  }
  return null;
}

// Runs one function and returns the parsed JSON payload. Throws NotteError on transport problems.
export async function runNotteFunction(functionId, variables, timeoutMs = 55_000) {
  const key = process.env.NOTTE_API_KEY;
  if (!key) throw new NotteError("server_not_configured", 500, "The server has no NOTTE_API_KEY set yet.");

  const client = new Client({ name: "stayfinder", version: "1.0.0" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(MCP_URL), {
        requestInit: { headers: { Authorization: `Bearer ${key}` } },
      })
    );
    const r = await client.callTool(
      { name: "run", arguments: { function_id: functionId, variables } },
      undefined,
      { timeout: timeoutMs }
    );
    if (r.isError) throw new NotteError("upstream_error", 502, "The search service reported an error.");

    let data = r.structuredContent;
    if (!data) {
      const text = r.content?.find((c) => c.type === "text")?.text;
      try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!data) throw new NotteError("unexpected_response", 502, "The search service returned an unreadable response.");
    return data;
  } catch (e) {
    if (e instanceof NotteError) throw e;
    const msg = String(e?.message || "");
    if (/401|403|unauthor/i.test(msg)) throw new NotteError("bad_api_key", 502, "The server’s Notte API key was rejected.");
    if (/timeout|timed out/i.test(msg)) throw new NotteError("timeout", 504, "The search took too long to respond.");
    throw new NotteError("upstream_error", 502, "The search service is unavailable.");
  } finally {
    client.close().catch(() => {});
  }
}
