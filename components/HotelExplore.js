"use client";
import { useMemo, useState } from "react";
import SearchForm from "./SearchForm";
import HotelCard from "./HotelCard";
import HotelSkeleton from "./HotelSkeleton";
import FilterSheet from "./FilterSheet";
import ViewToggle from "./ViewToggle";
import ListMapView from "./ListMapView";
import ResultsMap from "./ResultsMap";
import { HeartIcon, SearchIcon, SlidersIcon, AlertIcon, CompassIcon, ChevronIcon } from "./Icons";
import { POPULAR, fmtDate, plural, money } from "../lib/search";
import { toItem } from "../lib/feed";
import { hotelMarkers } from "../lib/map";

// The whole Hotels explore tab. All state comes from useHotelSearch() (owned by page.js).
export default function HotelExplore({ hotels: h, filtersOpen, setFiltersOpen, onBook }) {
  const [editing, setEditing] = useState(false); // expand the search card after a search (mobile)
  const [view, setView] = useState("list");
  const { form, setForm, ages, setAges, formError, hasSearched, loading, notice, data, query, meta, all, visible, sort, setSort,
    onlyFree, setOnlyFree, onlySaved, setOnlySaved, savedIds, toggleSaved, filterCount, search } = h;
  const showCard = !hasSearched || editing;

  async function run(f = form, a = ages) {
    const started = await search(f, a);
    if (started) { setEditing(false); setView("list"); window.scrollTo({ top: 0 }); } else { setEditing(true); }
  }
  const popularSearch = (d) => { const next = { ...form, destination: d, destinationPin: null }; setForm(next); run(next); };

  // Filters that were actually sent with the last search, shown as read-only chips.
  const applied = useMemo(() => {
    if (!query) return [];
    const out = [];
    if (query.star_rating?.length) out.push(query.star_rating.length === 1 ? "5 stars" : `${Math.min(...query.star_rating)}+ stars`);
    if (query.min_price != null && query.max_price != null) out.push(`${money(query.min_price, query.currency)} – ${money(query.max_price, query.currency)}`);
    else if (query.min_price != null) out.push(`From ${money(query.min_price, query.currency)}`);
    else if (query.max_price != null) out.push(`Up to ${money(query.max_price, query.currency)}`);
    if (query.free_cancellation) out.push("Free cancellation");
    if (query.currency !== "USD") out.push(query.currency);
    return out;
  }, [query]);

  const mapItems = useMemo(() => visible.map((p) => toItem("hotel", p, { currency: meta.currency })), [visible, meta.currency]);
  const markers = useMemo(() => hotelMarkers(mapItems), [mapItems]);
  const savedKeys = useMemo(() => new Set([...savedIds].map((id) => `hotel:${id}`)), [savedIds]);
  const bookItem = (p) => onBook?.(toItem("hotel", p, { currency: meta.currency }));

  return (
    <main className="explore">
      <div className="explore-head">
        <h1>Find your next escape</h1>
        <p className="lede">Search stays by city, dates and guests, then book on Booking.com.</p>
      </div>

      <div className="explore-grid">
        <aside className="side">
          {hasSearched && !editing && query && (
            <button type="button" className="summary-pill" onClick={() => setEditing(true)} aria-label="Edit your search">
              <SearchIcon />
              <span className="summary-text">
                <strong>{query.destination}</strong>
                <span>
                  {fmtDate(query.checkin_date)} – {fmtDate(query.checkout_date)} · {plural(query.adults + query.children, "guest")} · {plural(query.rooms, "room")}
                </span>
              </span>
              <span className="summary-edit">Edit</span>
            </button>
          )}

          <div className={`search-card${showCard ? " is-open" : ""}`}>
            <SearchForm
              form={form} setForm={setForm} ages={ages} setAges={setAges}
              onSubmit={() => run()} onOpenFilters={() => setFiltersOpen(true)}
              filterCount={filterCount} loading={loading} error={formError}
            />
            {hasSearched && editing && (
              <button type="button" className="btn btn-ghost btn-block collapse-btn" onClick={() => setEditing(false)}>
                <ChevronIcon style={{ transform: "rotate(180deg)" }} /> Hide search
              </button>
            )}
          </div>
        </aside>

        <section className="results" aria-label="Search results" aria-busy={loading}>
          {!hasSearched && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true"><CompassIcon width={28} height={28} /></span>
              <h2>Where would you like to stay?</h2>
              <p className="muted">Pick a destination and your dates, or start with a popular city.</p>
              <div className="chips center">
                {POPULAR.map((d) => (
                  <button type="button" key={d} className="chip" onClick={() => popularSearch(d)}>{d.split(",")[0]}</button>
                ))}
              </div>
            </div>
          )}

          {hasSearched && (
            <>
              <div className="toolbar">
                <div className="chips" role="group" aria-label="Sort and quick filters">
                  <button type="button" className="chip" aria-pressed={sort === ""} onClick={() => setSort("")}>Best match</button>
                  <button type="button" className="chip" aria-pressed={sort === "price"} onClick={() => setSort("price")}>Lowest price</button>
                  <button type="button" className="chip" aria-pressed={sort === "rating"} onClick={() => setSort("rating")}>Top rated</button>
                  <span className="chip-sep" aria-hidden="true" />
                  <button type="button" className="chip" aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)}>Free cancellation</button>
                  <button type="button" className="chip" aria-pressed={onlySaved} onClick={() => setOnlySaved((v) => !v)}>
                    <HeartIcon width={15} height={15} filled={onlySaved} /> Saved
                  </button>
                  <button type="button" className="chip chip-filters" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}
                    aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`}>
                    <SlidersIcon width={15} height={15} /> Filters{filterCount > 0 ? ` · ${filterCount}` : ""}
                  </button>
                </div>
                {data && <ViewToggle view={view} onChange={setView} />}
              </div>

              {(applied.length > 0 || data) && (
                <div className="result-meta">
                  {data && (
                    <p className="muted">
                      <strong>{meta.resolved_destination || meta.destination}</strong>
                      {" · "}{meta.total_results?.toLocaleString()} stays · showing {visible.length}
                    </p>
                  )}
                  {applied.length > 0 && (
                    <div className="applied">
                      {applied.map((a) => <span className="tag" key={a}>{a}</span>)}
                      <button type="button" className="link-btn" onClick={() => setFiltersOpen(true)}>Edit filters</button>
                    </div>
                  )}
                </div>
              )}

              <div role="status" aria-live="polite" className="sr-only">
                {loading ? "Searching Booking.com" : data ? `${visible.length} stays shown` : ""}
              </div>

              {loading && (
                <>
                  <p className="muted small loading-note">Searching Booking.com… usually 10–20 seconds.</p>
                  <div className="list">{[0, 1, 2, 3].map((i) => <HotelSkeleton key={i} />)}</div>
                </>
              )}

              {notice?.kind === "error" && (
                <div className="state err" role="alert">
                  <AlertIcon width={26} height={26} />
                  <h2>Something went wrong</h2>
                  <p>{notice.message}</p>
                  <button type="button" className="btn btn-primary" onClick={() => run()}>Try again</button>
                </div>
              )}

              {notice?.kind === "empty" && (
                <div className="state">
                  <SearchIcon width={26} height={26} />
                  <h2>No stays found</h2>
                  <p>{notice.message}</p>
                  <div className="state-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setFiltersOpen(true)}>Edit filters</button>
                    <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Change search</button>
                  </div>
                </div>
              )}

              {data && all.length > 0 && (
                visible.length === 0 ? (
                  <div className="state">
                    <SlidersIcon width={26} height={26} />
                    <h2>Nothing matches these quick filters</h2>
                    <p>Try turning off Free cancellation or Saved.</p>
                    <button type="button" className="btn btn-primary" onClick={() => { setOnlyFree(false); setOnlySaved(false); }}>Clear quick filters</button>
                  </div>
                ) : (
                  <ListMapView view={view}
                    list={
                      <div className="list">
                        {visible.map((p) => (
                          <HotelCard key={p.property_id} p={p} fallbackCurrency={meta.currency} nights={meta.nights}
                            isFav={savedIds.has(p.property_id)} onToggleFav={toggleSaved} onBook={bookItem} />
                        ))}
                      </div>
                    }
                    map={(active) => (
                      <ResultsMap active={active} markers={markers} savedKeys={savedKeys} label="Stays map"
                        onToggleSave={(it) => toggleSaved(it.raw)} onBook={(it) => onBook?.(it)} onOpen={() => {}}
                        note={markers.length < visible.length ? `${visible.length - markers.length} stays have no map location.` : ""}
                        emptyText="None of these stays have a map location." />
                    )} />
                )
              )}

              {data && (
                <details className="raw">
                  <summary>Raw API response</summary>
                  <pre>{JSON.stringify(data, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </section>
      </div>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} form={form} setForm={setForm}
        hasSearched={hasSearched}
        onApply={() => { setFiltersOpen(false); if (hasSearched) run(); }} />
    </main>
  );
}
