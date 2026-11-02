"use client";
import { useMemo } from "react";
import Sheet from "./Sheet";
import ResultsMap from "./ResultsMap";
import { hotelMarkers, bikeMarkers, tripMarkers } from "../lib/map";
import { useBikePlaces } from "../lib/useBikePlaces";

// One map for the whole Home feed: hotels (real coordinates), the car pick-up point, and bike shops (placed by address).
export default function FeedMapSheet({ open, onClose, city, items, carMeta, savedKeys, onToggleSave, onOpen, onBook, onShowCars }) {
  const bikeItems = items.bikes;
  const addresses = useMemo(() => bikeItems.map((b) => b.address), [bikeItems]);
  const { places, total, done, failed, loading } = useBikePlaces(addresses, city.label, open);

  const markers = useMemo(() => [
    ...hotelMarkers(items.hotels),
    ...tripMarkers(carMeta, { pickup: city.car }, items.cars, onShowCars),
    ...bikeMarkers(bikeItems, places),
  ], [items.hotels, items.cars, bikeItems, places, carMeta, city, onShowCars]);

  const note = [
    loading ? `Placing bike shops on the map… ${done}/${total}` : "",
    !loading && failed ? `${failed} of ${total} bike pick-up addresses couldn’t be placed.` : "",
  ].filter(Boolean).join(" ");

  return (
    <Sheet open={open} onClose={onClose} title={`${city.label} on the map`} className="sheet-map">
      <ResultsMap markers={markers} savedKeys={savedKeys} onToggleSave={onToggleSave} onOpen={onOpen} onBook={onBook}
        note={note} emptyText="Sections are still loading. Pins appear as soon as they are ready." label={`${city.label} map`} />
      <p className="muted small">Stays use their real coordinates. “A” is the car pick-up point. Bike shops are placed from their address using OpenStreetMap.</p>
    </Sheet>
  );
}
