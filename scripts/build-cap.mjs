// Builds the static (exported) site for Capacitor.
// Static export cannot include API routes, so we temporarily move app/api away.
// The app then calls your deployed Vercel API via NEXT_PUBLIC_API_BASE.
import { existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const base = process.env.NEXT_PUBLIC_API_BASE;
if (!base || !/^https:\/\//.test(base)) {
  console.error("Set NEXT_PUBLIC_API_BASE to your deployed https URL, e.g.\n  NEXT_PUBLIC_API_BASE=https://your-project.vercel.app npm run build:cap");
  process.exit(1);
}

const api = "app/api";
const backup = ".api-backup";
let moved = false;

try {
  if (existsSync(api)) { renameSync(api, backup); moved = true; }
  rmSync(".next", { recursive: true, force: true });
  const r = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CAP: "1" },
  });
  if (r.status !== 0) process.exitCode = r.status ?? 1;
} finally {
  if (moved) renameSync(backup, api);
}
