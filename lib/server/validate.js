// Small input/output helpers shared by the bike routes (server-only).
export const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const place = (v, max = 100) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

// Optional numeric input: "" / null / undefined -> null; otherwise a finite number in [min, max] or `undefined` (invalid).
export function optNumber(v, { min = 0, max = 1e6, integer = false } = {}) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) return undefined;
  return n;
}

export const https = (u) => (typeof u === "string" && /^https:\/\//.test(u) && u.length < 4000 ? u : null);
export const str = (v, max = 1000) => (typeof v === "string" && v.trim() ? v.slice(0, max) : null);
export const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const bool = (v) => (typeof v === "boolean" ? v : null);
