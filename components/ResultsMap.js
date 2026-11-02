"use client";
import { useState } from "react";
import LazyMap from "./LazyMap";
import ItemRow from "./ItemRow";
import { CloseIcon, PinIcon } from "./Icons";

// A map of search results plus a preview panel for the tapped pin. Used by hotels, cars, bikes and the Home feed.
// markers come from lib/map.js (hotelMarkers / tripMarkers / bikeMarkers); items inside them are unified items.
export default function ResultsMap({ markers, savedKeys, onToggleSave, onOpen, onBook, active = true, note = "", emptyText = "Nothing to show on the map yet.", label = "Results map" }) {
  const [sel, setSel] = useState(null);
  const selected = markers.find((m) => m.id === sel) || null;

  return (
    <div className="results-map">
      <LazyMap markers={markers} selectedId={selected?.id || null} onSelect={setSel} onMapClick={() => setSel(null)} active={active} label={label} />
      {markers.length === 0 && <p className="muted small map-caption" role="status">{emptyText}</p>}
      {note && <p className="muted small map-caption" role="status">{note}</p>}

      {selected && (
        <section className="map-panel" aria-label={`Selected: ${selected.title}`}>
          <div className="map-panel-head">
            <div>
              <strong><PinIcon width={14} height={14} /> {selected.title}</strong>
              {selected.subtitle && <p className="muted small">{selected.subtitle}</p>}
              {selected.note && <p className="muted small">{selected.note}</p>}
            </div>
            <button type="button" className="icon-btn" aria-label="Close preview" onClick={() => setSel(null)}><CloseIcon /></button>
          </div>
          {selected.items.map((it) => (
            <ItemRow key={it.key} item={it} isFav={savedKeys.has(it.key)} onToggleFav={onToggleSave} onOpen={onOpen} onBook={onBook} />
          ))}
          {selected.cta && <button type="button" className="btn btn-primary btn-block" onClick={selected.cta.onClick}>{selected.cta.label}</button>}
        </section>
      )}
    </div>
  );
}
