"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window` when it loads, so the map is only ever loaded in the browser, and only when first needed.
const LazyMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-box map-loading" role="status">Loading map…</div>,
});
export default LazyMap;
