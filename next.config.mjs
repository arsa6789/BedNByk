// CAP=1 is set by scripts/build-cap.mjs: builds a static site for Capacitor.
const isCapacitor = process.env.CAP === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitor ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
