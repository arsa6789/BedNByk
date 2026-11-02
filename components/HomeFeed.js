"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import FeedCard from "./FeedCard";
import FeedMapSheet from "./FeedMapSheet";
import TripPlanner from "./TripPlanner";
import ItemAction from "./ItemAction";
import { CarIcon, BikeIcon, BedIcon, StarIcon, MapIcon, ChevronIcon, AlertIcon, RefreshIcon, SearchIcon, ExternalIcon, HistoryIcon } from "./Icons";
import { FEED_CITIES, FEED_KINDS, feedDates, toItem, topRated } from "../lib/feed";
import { MODE_LABEL, timeAgo } from "../lib/history";
import { fmtDate } from "../lib/search";

const SECTIONS = {
  cars: { title: "Available cars & vehicles", kind: "car", Icon: CarIcon, empty: "No cars found for these dates." },
  bikes: { title: "Bikes, scooters & bicycles", kind: "bike", Icon: BikeIcon, empty: "No bikes found for these dates." },
  hotels: { title: "Hotels & stays", kind: "hotel", Icon: BedIcon, empty: "No stays found for these dates." },
};
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "cars", label: "Cars" },
  { id: "bikes", label: "Bikes" },
  { id: "hotels", label: "Hotels" },
  { id: "top", label: "Top rated" },
];
const MODE_ICON = { hotels: BedIcon, cars: CarIcon, bikes: BikeIcon };

function SkeletonRow() {
  return (
    <div className="carousel" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div className="carousel-item" key={i}>
          <div className="feed-card"><div className="sk feed-media" /><div className="feed-body"><div className="sk sk-line" style={{ width: "80%" }} /><div className="sk sk-line" style={{ width: "50%" }} /></div></div>
        </div>
      ))}
    </div>
  );
}

// Horizontal scroll-snap row. On desktop, arrow buttons scroll it (touch users just swipe).
function Carousel({ label, children }) {
  const ref = useRef(null);
  const by = (dir) => ref.current?.scrollBy({ left: dir * Math.max(240, ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="carousel-wrap">
      <button type="button" className="carousel-arrow left" aria-label={`Scroll ${label} left`} onClick={() => by(-1)}><ChevronIcon style={{ transform: "rotate(90deg)" }} /></button>
      <div className="carousel" ref={ref} role="list" aria-label={label} tabIndex={0}>{children}</div>
      <button type="button" className="carousel-arrow right" aria-label={`Scroll ${label} right`} onClick={() => by(1)}><ChevronIcon style={{ transform: "rotate(-90deg)" }} /></button>
    </div>
  );
}

// One section. It asks for its data only once it is close to the screen, so the page never fires all searches at once.
function Section({ id, title, Icon, state, items, load, eager = false, empty, subtitle, onSeeAll, cardProps, savedKeys, showKind }) {
  const box = useRef(null);
  const [near, setNear] = useState(eager);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (near || !box.current) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(box.current);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (id && near && state?.status === "idle") loadRef.current(id);
  }, [id, near, state?.status]);

  return (
    <section className="feed-section" ref={box} aria-labelledby={`sec-${id || "top"}`} aria-busy={state?.status === "loading"}>
      <div className="feed-head">
        <h2 id={`sec-${id || "top"}`}><Icon width={20} height={20} /> {title}</h2>
        {onSeeAll && items.length > 0 && <button type="button" className="link-btn" onClick={onSeeAll}>See all</button>}
      </div>
      {subtitle && <p className="muted small feed-subtitle">{subtitle}</p>}

      {(!state || state.status === "idle" || state.status === "loading") && items.length === 0 && <SkeletonRow />}

      {state?.status === "error" && (
        <div className="feed-error" role="alert">
          <AlertIcon width={20} height={20} />
          <span>{state.error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => load(id, { force: true })}><RefreshIcon width={14} height={14} /> Retry</button>
        </div>
      )}

      {state?.status === "ready" && items.length === 0 && <p className="muted feed-empty">{empty}</p>}

      {items.length > 0 && (
        <Carousel label={title}>
          {items.map((it) => (
            <div className="carousel-item" role="listitem" key={it.key}>
              <FeedCard item={it} showKind={showKind} {...cardProps} isFav={savedKeys.has(it.key)} />
            </div>
          ))}
        </Carousel>
      )}
    </section>
  );
}

function ContinueCard({ entry, onResume }) {
  const Icon = MODE_ICON[entry.mode] || SearchIcon;
  const isSearch = entry.type === "search";
  return (
    <div className="carousel-item" role="listitem">
      <div className="continue-card">
        <span className="continue-icon" aria-hidden="true"><Icon width={20} height={20} /></span>
        <span className="continue-text">
          <span className="muted small">{isSearch ? `Recent search · ${MODE_LABEL[entry.mode]}` : "Booking page opened"} · {timeAgo(entry.ts)}</span>
          <strong>{entry.title}</strong>
          {entry.subtitle && <span className="muted small">{entry.subtitle}</span>}
        </span>
        {isSearch ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onResume(entry)}>Search again</button>
        ) : entry.href ? (
          <a className="btn btn-ghost btn-sm" href={entry.href} target="_blank" rel="noopener noreferrer">Open again <ExternalIcon width={13} height={13} /></a>
        ) : null}
      </div>
    </div>
  );
}

export default function HomeFeed({
  cityId, onCity, cat, onCat, feed, savedKeys, onToggleSave, onOpen, onBook, entries, onResume, onSeeAll, onShowCars, onGoHistory,
  planner,
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const city = FEED_CITIES.find((c) => c.id === cityId) || FEED_CITIES[0];
  const { start, end } = feedDates();
  const { sections, load } = feed;

  // Unified items per section.
  const items = useMemo(() => ({
    hotels: sections.hotels.items.map((r) => toItem("hotel", r, { currency: sections.hotels.meta?.currency })),
    cars: sections.cars.items.map((r) => toItem("car", r)),
    bikes: sections.bikes.items.map((r) => toItem("bike", r)),
  }), [sections]);
  const top = useMemo(() => topRated([...items.cars, ...items.bikes, ...items.hotels]), [items]);

  // The "Top rated" chip needs every section, so it loads them all right away.
  useEffect(() => {
    if (cat !== "top") return;
    FEED_KINDS.forEach((k) => { if (sections[k].status === "idle") load(k); });
  }, [cat, sections, load]);

  const cardProps = { onToggleFav: onToggleSave, onOpen, onBook };
  const show = (k) => cat === "all" || cat === k;
  const anyLoading = FEED_KINDS.some((k) => sections[k].status === "loading");
  const recent = entries.slice(0, 6);

  return (
    <main className="home">
      <div className="explore-head">
        <h1>Where to next?</h1>
        <p className="lede">Live picks for {city.label}, {fmtDate(start)} – {fmtDate(end)}. Save what you like or book in a tap.</p>
      </div>

      <div className="home-controls">
        <div className="chips" role="group" aria-label="Feed destination">
          {FEED_CITIES.map((c) => (
            <button type="button" key={c.id} className="chip chip-city" aria-pressed={c.id === city.id} onClick={() => onCity(c.id)}>{c.label}</button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm map-open" onClick={() => setMapOpen(true)} aria-haspopup="dialog">
          <MapIcon width={16} height={16} /> Map
        </button>
      </div>

      <div className="chips cat-chips" role="group" aria-label="Browse by category">
        {CATEGORIES.map((c) => (
          <button type="button" key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => onCat(c.id)}>
            {c.id === "top" && <StarIcon width={13} height={13} />} {c.label}
          </button>
        ))}
      </div>

      <div role="status" aria-live="polite" className="sr-only">{anyLoading ? "Loading picks" : ""}</div>

      {recent.length > 0 && (cat === "all") && (
        <section className="feed-section" aria-labelledby="sec-continue">
          <div className="feed-head">
            <h2 id="sec-continue"><HistoryIcon width={20} height={20} /> Continue where you left off</h2>
            <button type="button" className="link-btn" onClick={onGoHistory}>History</button>
          </div>
          <div className="carousel" role="list" aria-label="Recent searches and bookings" tabIndex={0}>
            {recent.map((e) => <ContinueCard key={e.id} entry={e} onResume={onResume} />)}
          </div>
        </section>
      )}

      {FEED_KINDS.filter(show).map((k) => {
        const s = SECTIONS[k];
        return (
          <Fragment key={`${city.id}:${k}`}>
          <Section id={k} title={s.title} Icon={s.Icon} state={sections[k]} items={items[k]} load={load}
            empty={s.empty} onSeeAll={() => onSeeAll(k, city)} cardProps={cardProps} savedKeys={savedKeys} eager={cat === k} />
          {k === "cars" && planner}
          </Fragment>
        );
      })}

      {(cat === "all" || cat === "top") && (
        <Section key={`${city.id}:top`} id={null} title="Popular & top rated" Icon={StarIcon} state={{ status: anyLoading && !top.length ? "loading" : "ready" }}
          items={top} load={load} empty="Top picks appear here once the sections above have loaded."
          subtitle="Highest-rated picks across stays, cars and bikes (all rated out of 10)." cardProps={cardProps} savedKeys={savedKeys} showKind />
      )}

      <FeedMapSheet open={mapOpen} onClose={() => setMapOpen(false)} city={city} items={items} carMeta={sections.cars.meta}
        savedKeys={savedKeys} onToggleSave={onToggleSave} onOpen={(it) => { setMapOpen(false); onOpen(it); }} onBook={onBook}
        onShowCars={() => { setMapOpen(false); onCat("cars"); }} />
    </main>
  );
}
