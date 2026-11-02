"use client";
import { ListIcon, MapIcon } from "./Icons";

// List <-> Map switch for results. Both views keep the same results, filters and saved hearts.
export default function ViewToggle({ view, onChange }) {
  return (
    <div className="view-toggle" role="group" aria-label="Results view">
      <button type="button" aria-pressed={view === "list"} onClick={() => onChange("list")}><ListIcon width={16} height={16} /> List</button>
      <button type="button" aria-pressed={view === "map"} onClick={() => onChange("map")}><MapIcon width={16} height={16} /> Map</button>
    </div>
  );
}
