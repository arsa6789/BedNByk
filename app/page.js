"use client";
import { useEffect, useMemo, useState } from "react";
import HotelExplore from "../components/HotelExplore";
import HotelCard from "../components/HotelCard";
import BottomNav from "../components/BottomNav";
import ModeSwitch from "../components/ModeSwitch";
import CarExplore from "../components/CarExplore";
import CarCard from "../components/CarCard";
import BikeExplore from "../components/BikeExplore";
import BikeCard from "../components/BikeCard";
import BikeDetailsSheet from "../components/BikeDetailsSheet";
import HomeFeed from "../components/HomeFeed";
import HistoryTab from "../components/HistoryTab";
import TripPlanner from "../components/TripPlanner";
import { useHotelSearch } from "../lib/useHotelSearch";
import { useBikeSearch } from "../lib/useBikeSearch";
import { useCarSearch } from "../lib/useCarSearch";
import { useHistory } from "../lib/useHistory";
import { useFeed } from "../lib/useFeed";
import { FEED_CITIES, FEED_CURRENCY, feedDates, toItem } from "../lib/feed";
import { refreshSnapshot } from "../lib/history";
import { DEFAULT_BIKE_FILTERS } from "../lib/bikes";
import { HeartIcon, CarIcon, BikeIcon } from "../components/Icons";
import { plural } from "../lib/search";

const CITY_KEY = "stayfinder:feed-city:v1";
const SPLASH_MS = 2200; // keep in sync with .splash-fill animation duration in globals.css
const FADE_MS = 400; // keep in sync with .splash transition in globals.css

function Brand() {
  return (
    <div className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand-mark" src="/brand/mark.png" alt="" width="52" height="35" />
      <span className="brand-name">Bed<span>N</span>Byk</span>
    </div>
  );
}

// Brand splash: faint mark pattern, the logo, and a progress bar that fills over SPLASH_MS.
function Splash({ leaving }) {
  return (
    <div className={`splash${leaving ? " out" : ""}`} role="status" aria-label="Loading BedNByk">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="splash-bg splash-bg-a" src="/brand/mark.png" alt="" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="splash-bg splash-bg-b" src="/brand/mark.png" alt="" aria-hidden="true" />
      <div className="splash-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="splash-logo" src="/brand/logo.png" alt="BedNByk – Experience | Adventure" width="360" height="308" />
      </div>
      <div className="splash-progress">
        <div className="splash-track" aria-hidden="true"><div className="splash-fill" /></div>
        <p>Loading your adventure…</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [splash, setSplash] = useState("show"); // "show" | "leaving" | "gone"
  const [tab, setTab] = useState("home");        // "home" | "explore" | "saved" | "history"
  const [mode, setMode] = useState("hotels");    // "hotels" | "cars" | "bikes"
  const [cityId, setCityId] = useState(FEED_CITIES[0].id);
  const [cityReady, setCityReady] = useState(false); // the saved feed city is read after mount; the feed waits for it
  const [feedCat, setFeedCat] = useState("all");
  const [hotelFiltersOpen, setHotelFiltersOpen] = useState(false);
  const [carFiltersOpen, setCarFiltersOpen] = useState(false);
  const [bikeFiltersOpen, setBikeFiltersOpen] = useState(false);

  const history = useHistory();
  const hotels = useHotelSearch({ onSearch: (snap) => history.addSearch("hotels", snap) });
  const cars = useCarSearch({ onSearch: (snap) => history.addSearch("cars", snap) });
  const bikes = useBikeSearch({ onSearch: (snap) => history.addSearch("bikes", snap) });
  const city = FEED_CITIES.find((c) => c.id === cityId) || FEED_CITIES[0];
  const feed = useFeed(city);

  // Splash
  useEffect(() => {
    const t1 = setTimeout(() => setSplash("leaving"), SPLASH_MS);
    const t2 = setTimeout(() => setSplash("gone"), SPLASH_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Remember the feed city on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved && FEED_CITIES.some((c) => c.id === saved)) setCityId(saved);
    } catch {}
    setCityReady(true);
  }, []);
  const pickCity = (id) => {
    setCityId(id);
    try { localStorage.setItem(CITY_KEY, id); } catch {}
  };

  const goTab = (t) => { setTab(t); window.scrollTo({ top: 0 }); };
  const goExplore = (m) => { setMode(m); setTab("explore"); window.scrollTo({ top: 0 }); };

  // ---------- shared handlers for unified items (feed cards, map previews) ----------
  const savedKeys = useMemo(() => new Set([
    ...hotels.saved.map((p) => `hotel:${p.property_id}`),
    ...cars.saved.map((v) => `car:${v.vehicle_id}`),
    ...bikes.saved.map((b) => `bike:${b.bike_id}`),
  ]), [hotels.saved, cars.saved, bikes.saved]);

  const toggleItem = (item) => {
    if (item.kind === "hotel") hotels.toggleSaved(item.raw);
    else if (item.kind === "car") cars.toggleSaved(item.raw);
    else bikes.toggleSaved(item.raw);
  };
  const openItem = (item) => { if (item.kind === "bike") bikes.openDetails(item.raw); };
  const recordBooking = (item) => history.addBooking(item);

  // ---------- "See all" on the feed: run the real search for the feed's city and dates ----------
  function seeAll(kind, c) {
    const { start, end } = feedDates();
    goExplore(kind === "hotels" ? "hotels" : kind === "cars" ? "cars" : "bikes");
    if (kind === "hotels") {
      const next = { ...hotels.form, destination: c.hotel, destinationPin: null, checkin: start, checkout: end, currency: FEED_CURRENCY,
        minPrice: "", maxPrice: "", stars: "", freeCancellation: false };
      hotels.setForm(next); hotels.search(next, hotels.ages);
    } else if (kind === "cars") {
      const next = { ...cars.form, pickup: c.car, pickupPin: null, differentDropoff: false, dropoff: "", dropoffPin: null,
        pickupDate: start, dropoffDate: end, currency: FEED_CURRENCY };
      cars.setForm(next); cars.search(next);
    } else {
      const next = { ...bikes.form, destination: c.bike, destinationPin: null, pickupDate: start, returnDate: end, currency: FEED_CURRENCY };
      bikes.setForm(next); bikes.setFilters(DEFAULT_BIKE_FILTERS); bikes.search(next, DEFAULT_BIKE_FILTERS);
    }
  }

  // ---------- "Continue where you left off" / History: run a past search again ----------
  function resume(entry) {
    const snap = refreshSnapshot(entry.mode, entry.snapshot);
    goExplore(entry.mode);
    if (entry.mode === "hotels") { hotels.setForm(snap.form); hotels.setAges(snap.ages || []); hotels.search(snap.form, snap.ages || []); }
    else if (entry.mode === "cars") { cars.setForm(snap.form); cars.search(snap.form); }
    else { bikes.setForm(snap.form); bikes.setFilters(snap.filters || DEFAULT_BIKE_FILTERS); bikes.search(snap.form, snap.filters || DEFAULT_BIKE_FILTERS); }
  }

  function findCarsFromPlanner() {
    goExplore("cars");
    cars.search(cars.form);
  }

  const searchedNow = ({ cars: cars.hasSearched, bikes: bikes.hasSearched, hotels: hotels.hasSearched })[mode];
  const showModes = tab === "explore" || tab === "saved";
  const partner = ({ cars: "Rentalcars.com", bikes: "BikesBooking.com", hotels: "Booking.com" })[mode];

  return (
    <>
      {splash !== "gone" && <Splash leaving={splash === "leaving"} />}

      <div className={`shell${tab === "explore" && searchedNow ? " is-searched" : ""}`}>
        <header className="topbar"><Brand /></header>
        {showModes && <ModeSwitch mode={mode} onChange={(m) => { setMode(m); window.scrollTo({ top: 0 }); }} />}

        {/* ============ HOME ============ */}
        {tab === "home" && cityReady && (
          <HomeFeed cityId={cityId} onCity={pickCity} cat={feedCat} onCat={setFeedCat} feed={feed}
            savedKeys={savedKeys} onToggleSave={toggleItem} onOpen={openItem} onBook={recordBooking}
            entries={history.entries} onResume={resume} onSeeAll={seeAll} onGoHistory={() => goTab("history")}
            planner={
              <TripPlanner form={cars.form} setForm={cars.setForm} near={city} loading={cars.loading} onFind={findCarsFromPlanner} />
            } />
        )}

        {/* ============ EXPLORE ============ */}
        {tab === "explore" && mode === "bikes" && (
          <BikeExplore bikes={bikes} filtersOpen={bikeFiltersOpen} setFiltersOpen={setBikeFiltersOpen} onBook={recordBooking} />
        )}
        {tab === "explore" && mode === "cars" && (
          <CarExplore cars={cars} filtersOpen={carFiltersOpen} setFiltersOpen={setCarFiltersOpen} onBook={recordBooking} />
        )}
        {tab === "explore" && mode === "hotels" && (
          <HotelExplore hotels={hotels} filtersOpen={hotelFiltersOpen} setFiltersOpen={setHotelFiltersOpen} onBook={recordBooking} />
        )}

        {/* ============ SAVED ============ */}
        {tab === "saved" && mode === "bikes" && (
          <main className="saved">
            <div className="explore-head">
              <h1>Saved bikes</h1>
              <p className="lede">
                {bikes.saved.length ? `${plural(bikes.saved.length, "bike")} saved on this device.` : "Hearts you tap are kept here."}
              </p>
            </div>
            {bikes.saved.length === 0 ? (
              <div className="empty">
                <span className="empty-icon" aria-hidden="true"><BikeIcon width={28} height={28} /></span>
                <h2>No saved bikes yet</h2>
                <p className="muted">Tap the heart on any bike to keep it here.</p>
                <button type="button" className="btn btn-primary" onClick={() => goTab("explore")}>Find a bike</button>
              </div>
            ) : (
              <>
                <p className="muted small note">Prices are from when you saved. Search again for current rates.</p>
                <div className="list">
                  {bikes.saved.map((b) => <BikeCard key={b.bike_id} b={b} isFav onToggleFav={bikes.toggleSaved} onDetails={bikes.openDetails} />)}
                </div>
              </>
            )}
          </main>
        )}
        {tab === "saved" && mode === "cars" && (
          <main className="saved">
            <div className="explore-head">
              <h1>Saved cars</h1>
              <p className="lede">
                {cars.saved.length ? `${plural(cars.saved.length, "car")} saved on this device.` : "Hearts you tap are kept here."}
              </p>
            </div>
            {cars.saved.length === 0 ? (
              <div className="empty">
                <span className="empty-icon" aria-hidden="true"><CarIcon width={28} height={28} /></span>
                <h2>No saved cars yet</h2>
                <p className="muted">Tap the heart on any car to keep it here.</p>
                <button type="button" className="btn btn-primary" onClick={() => goTab("explore")}>Find a car</button>
              </div>
            ) : (
              <>
                <p className="muted small note">Prices are from when you saved. Search again for current rates.</p>
                <div className="list">
                  {cars.saved.map((v) => <CarCard key={v.vehicle_id} v={v} isFav onToggleFav={cars.toggleSaved} onBook={(x) => recordBooking(toItem("car", x))} />)}
                </div>
              </>
            )}
          </main>
        )}
        {tab === "saved" && mode === "hotels" && (
          <main className="saved">
            <div className="explore-head">
              <h1>Saved stays</h1>
              <p className="lede">
                {hotels.saved.length ? `${plural(hotels.saved.length, "stay")} saved on this device.` : "Hearts you tap are kept here."}
              </p>
            </div>
            {hotels.saved.length === 0 ? (
              <div className="empty">
                <span className="empty-icon" aria-hidden="true"><HeartIcon width={28} height={28} /></span>
                <h2>No saved stays yet</h2>
                <p className="muted">Tap the heart on any stay to keep it here.</p>
                <button type="button" className="btn btn-primary" onClick={() => goTab("explore")}>Start exploring</button>
              </div>
            ) : (
              <>
                <p className="muted small note">Prices are from when you saved. Search again for current rates.</p>
                <div className="list">
                  {hotels.saved.map((p) => <HotelCard key={p.property_id} p={p} isFav onToggleFav={hotels.toggleSaved} onBook={(x) => recordBooking(toItem("hotel", x, {}))} />)}
                </div>
              </>
            )}
          </main>
        )}

        {/* ============ HISTORY ============ */}
        {tab === "history" && (
          <HistoryTab entries={history.entries} onResume={resume} onRemove={history.remove} onClear={history.clear} onHome={() => goTab("home")} />
        )}

        {tab !== "history" && (
          <footer className="foot">
            {tab === "home" ? "Prices and availability come from Booking.com, Rentalcars.com and BikesBooking.com and may change." : `Prices and availability come from ${partner} and may change.`}
            {" "}Unofficial search tool. Maps © OpenStreetMap contributors.
          </footer>
        )}
      </div>

      <BottomNav tab={tab} onTab={goTab}
        savedCount={({ cars: cars.saved.length, bikes: bikes.saved.length, hotels: hotels.saved.length })[mode]}
        savedNoun={({ cars: "cars", bikes: "bikes", hotels: "stays" })[mode]} />

      <BikeDetailsSheet details={bikes.details} onClose={bikes.closeDetails} onRetry={bikes.openDetails}
        onBook={(bike, href) => recordBooking({ ...toItem("bike", bike), href })} />
    </>
  );
}
