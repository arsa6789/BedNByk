"use client";
import { useEffect, useState } from "react";

// Shows the list or the map of the same results. Both stay mounted once opened, so switching is instant,
// the list keeps its scroll position and the map keeps its zoom. `map` is a function: map(isActive).
export default function ListMapView({ view, list, map }) {
  const [opened, setOpened] = useState(view === "map");
  useEffect(() => { if (view === "map") setOpened(true); }, [view]);
  return (
    <>
      <div hidden={view === "map"}>{list}</div>
      {opened && <div hidden={view !== "map"} className="view-fade">{map(view === "map")}</div>}
    </>
  );
}
