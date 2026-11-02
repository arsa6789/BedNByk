"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION } from "../lib/map";

// Thin wrapper around Leaflet (plain Leaflet, no react-leaflet, so there is one dependency to keep updated).
// Always loaded through LazyMap.js (client only), because Leaflet needs `window`.
//
// markers:  [{ id, lat, lng, kind: "hotel"|"bike"|"pickup"|"dropoff"|"pin", label, title, draggable? }]
// view:     { lat, lng, zoom, n } – change `n` to move the map there
// active:   set false while the map is hidden; it re-measures itself when it becomes visible again

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function iconFor(m, selected) {
  const cls = `pin pin-${m.kind}${selected ? " is-selected" : ""}`;
  const round = m.kind === "pickup" || m.kind === "dropoff" || m.kind === "pin";
  const html = round
    ? `<span class="${cls}"><b>${esc(m.kind === "pin" ? "" : m.label)}</b></span>`
    : `<span class="${cls}"><b>${esc(m.label)}</b></span>`;
  return L.divIcon({ className: "pin-wrap", html, iconSize: [0, 0], iconAnchor: [0, 0] });
}

export default function MapView({ markers = [], selectedId = null, onSelect, onMapClick, onDragEnd, view = null, active = true, label = "Map", emptyCenter = [25, 15], emptyZoom = 2 }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const lastFit = useRef("");
  const cb = useRef({});
  cb.current = { onSelect, onMapClick, onDragEnd };
  const [tilesFailed, setTilesFailed] = useState(false);

  // Create / destroy the map once.
  useEffect(() => {
    const m = L.map(el.current, {
      zoomControl: true, scrollWheelZoom: false, worldCopyJump: true,
      // Animations off: removing a map mid-animation (closing a sheet) makes Leaflet 1.9 throw in a timer.
      zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
    }).setView(emptyCenter, emptyZoom);
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION });
    let ok = false;
    tiles.on("tileload", () => { ok = true; setTilesFailed(false); });
    tiles.on("tileerror", () => { if (!ok) setTilesFailed(true); });
    tiles.addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => cb.current.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    // Wheel zoom only after the map was clicked, so scrolling the page never gets "stuck" on the map.
    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur", () => m.scrollWheelZoom.disable());
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => m.invalidateSize()) : null;
    ro?.observe(el.current);
    map.current = m;
    return () => { ro?.disconnect(); m.stop(); m.remove(); map.current = null; layer.current = null; lastFit.current = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw markers; re-fit the view only when the set of markers changes (not when one is selected).
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const mk of markers) {
      const marker = L.marker([mk.lat, mk.lng], {
        icon: iconFor(mk, mk.id === selectedId), title: mk.title || "", alt: mk.title || "Map pin",
        draggable: !!mk.draggable, keyboard: true, zIndexOffset: mk.id === selectedId ? 1000 : 0,
      });
      marker.on("click", (e) => { L.DomEvent.stopPropagation(e); cb.current.onSelect?.(mk.id); });
      marker.on("dragend", () => { const p = marker.getLatLng(); cb.current.onDragEnd?.(mk.id, { lat: p.lat, lng: p.lng }); });
      marker.addTo(g);
    }
    const key = markers.map((x) => x.id).sort().join("|");
    if (key !== lastFit.current) {
      lastFit.current = key;
      if (markers.length === 1) m.setView([markers[0].lat, markers[0].lng], Math.max(m.getZoom(), 13), { animate: false });
      else if (markers.length > 1) m.fitBounds(L.latLngBounds(markers.map((x) => [x.lat, x.lng])), { padding: [40, 40], maxZoom: 15, animate: false });
    }
  }, [markers, selectedId]);

  // Programmatic moves (search result chosen, "use my location", …).
  useEffect(() => {
    if (view && map.current) map.current.setView([view.lat, view.lng], view.zoom || 14, { animate: false });
  }, [view?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure after being hidden (list <-> map toggle).
  useEffect(() => {
    if (active && map.current) setTimeout(() => map.current && map.current.invalidateSize(), 50);
  }, [active]);

  return (
    <div className="map-box">
      <div ref={el} className="map-el" role="region" aria-label={label} tabIndex={0} />
      {tilesFailed && <p className="map-note" role="status">Map tiles couldn’t load. Check your connection.</p>}
    </div>
  );
}
