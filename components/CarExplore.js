"use client";
import { useMemo, useState } from "react";
import CarSearchForm from "./CarSearchForm";
import CarCard from "./CarCard";
import CarSkeleton from "./CarSkeleton";
import CarFilterSheet from "./CarFilterSheet";
import ViewToggle from "./ViewToggle";
import ListMapView from "./ListMapView";
import ResultsMap from "./ResultsMap";
import { HeartIcon, SearchIcon, SlidersIcon, AlertIcon, CarIcon, ChevronIcon } from "./Icons";
import { CAR_POPULAR, countCarFilters } from "../lib/cars";
import { fmtDate } from "../lib/search";
import { toItem } from "../lib/feed";
import { tripMarkers } from "../lib/map";

// The whole Car Rentals explore tab. All state comes from useCarSearch() (owned by page.js).
export default function CarExplore({ cars, filtersOpen, setFiltersOpen, onBook }) {
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState("list");
  const {
    form, setForm, formError, hasSearched, loading, loadingMore, moreError, notice, vehicles, meta, query,
    filters, setFilters, sort, setSort, onlySaved, setOnlySaved, savedIds, toggleSaved, visible, hasMore,
    search, loadMore, infoNote,
  } = cars;
  const filterCount = countCarFilters(filters);
  const showCard = !hasSearched || editing;

  async function run(f) {
    const started = await search(f);
    if (started) { setEditing(false); setView("list"); window.scrollTo({ top: 0 }); } else { setEditing(true); }
  }
  const popular = (name) => { const next = { ...form, pickup: name, pickupPin: null }; setForm(next); run(next); };

  const mapItems = useMemo(() => visible.map((v) => toItem("car", v, { trip: v.trip })), [visible]);
  const markers = useMemo(() => tripMarkers(meta, form, mapItems, () => setView("list")), [meta, form, mapItems]);
  const bookItem = (v) => onBook?.(toItem("car", v, { trip: v.trip }));
  const savedKeys = useMemo(() => new Set([...savedIds].map((id) => `car:${id}`)), [savedIds]);

  return (
    <main className="explore">
      <div className="explore-head">
        <h1>Rent a car for the road ahead</h1>
        <p className="lede">Compare rental cars by location, dates and driver age, then book on Rentalcars.com.</p>
      </div>

      <div className="explore-grid">
        <aside className="side">
          {hasSearched && !editing && query && (
            <button type="button" className="summary-pill" onClick={() => setEditing(true)} aria-label="Edit your search">
              <SearchIcon />
              <span className="summary-text">
                <strong>{query.pickup_location}</strong>
                <span>{fmtDate(query.pickup_date)} – {fmtDate(query.dropoff_date)} · age {query.driver_age}</span>
              </span>
              <span className="summary-edit">Edit</span>
            </button>
          )}
          <div className={`search-card${showCard ? " is-open" : ""}`}>
            <CarSearchForm form={form} setForm={setForm} onSubmit={() => run(form)}
              onOpenFilters={() => setFiltersOpen(true)} filterCount={filterCount} loading={loading} error={formError} />
            {hasSearched && editing && (
              <button type="button" className="btn btn-ghost btn-block collapse-btn" onClick={() => setEditing(false)}>
                <ChevronIcon style={{ transform: "rotate(180deg)" }} /> Hide search
              </button>
            )}
          </div>
        </aside>

        <section className="results" aria-label="Car search results" aria-busy={loading}>
          {!hasSearched && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true"><CarIcon width={28} height={28} /></span>
              <h2>Where do you need a car?</h2>
              <p className="muted">Enter a pickup location and your dates, or start with a popular airport.</p>
              <div className="chips center">
                {CAR_POPULAR.map((d) => (
                  <button type="button" key={d} className="chip" onClick={() => popular(d)}>
                    {d.replace(/ (International )?Airport$/, "").replace("Charles de Gaulle", "CDG")}
                  </button>
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
                  <button type="button" className="chip" aria-pressed={sort === "rating"} onClick={() => setSort("rating")}>Top supplier</button>
                  <span className="chip-sep" aria-hidden="true" />
                  <button type="button" className="chip" aria-pressed={onlySaved} onClick={() => setOnlySaved((v) => !v)}>
                    <HeartIcon width={15} height={15} filled={onlySaved} /> Saved
                  </button>
                  <button type="button" className="chip chip-filters" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}
                    aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`}>
                    <SlidersIcon width={15} height={15} /> Filters{filterCount > 0 ? ` · ${filterCount}` : ""}
                  </button>
                </div>
                {vehicles.length > 0 && <ViewToggle view={view} onChange={setView} />}
              </div>

              {meta && (
                <div className="result-meta">
                  <p className="muted">
                    <strong>{meta.pickup_location || query?.pickup_location}</strong>
                    {meta.dropoff_location && meta.dropoff_location !== meta.pickup_location ? ` → ${meta.dropoff_location}` : ""}
                    {meta.rental_days ? ` · ${meta.rental_days} day${meta.rental_days === 1 ? "" : "s"}` : ""}
                    {meta.total_available != null ? ` · ${meta.total_available.toLocaleString()} cars` : ""}
                    {` · showing ${visible.length} of ${vehicles.length} loaded`}
                  </p>
                  {filterCount > 0 && (
                    <div className="applied">
                      <span className="tag">{filterCount} filter{filterCount === 1 ? "" : "s"} on</span>
                      <button type="button" className="link-btn" onClick={() => setFiltersOpen(true)}>Edit filters</button>
                    </div>
                  )}
                </div>
              )}

              {infoNote && <div className="notice" role="status">{infoNote}</div>}

              <div role="status" aria-live="polite" className="sr-only">
                {loading ? "Searching Rentalcars.com" : meta ? `${visible.length} cars shown` : ""}
              </div>

              {loading && (
                <>
                  <p className="muted small loading-note">Searching Rentalcars.com… usually 10–20 seconds.</p>
                  <div className="list">{[0, 1, 2, 3].map((i) => <CarSkeleton key={i} />)}</div>
                </>
              )}

              {notice?.kind === "error" && (
                <div className="state err" role="alert">
                  <AlertIcon width={26} height={26} />
                  <h2>Something went wrong</h2>
                  <p>{notice.message}</p>
                  <div className="state-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>Change search</button>
                    <button type="button" className="btn btn-primary" onClick={() => run(form)}>Try again</button>
                  </div>
                </div>
              )}

              {notice?.kind === "empty" && (
                <div className="state">
                  <SearchIcon width={26} height={26} />
                  <h2>No cars found</h2>
                  <p>{notice.message}</p>
                  <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Change search</button>
                </div>
              )}

              {vehicles.length > 0 && (
                visible.length === 0 ? (
                  <div className="state">
                    <SlidersIcon width={26} height={26} />
                    <h2>No loaded cars match these filters</h2>
                    <p>Loosen the filters{hasMore ? " or load more cars" : ""}.</p>
                    <button type="button" className="btn btn-primary"
                      onClick={() => { setFilters({ transmission: "", category: "", seats: 0, maxTotal: "", freeCancellation: false, airCon: false }); setOnlySaved(false); }}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <ListMapView view={view}
                    list={
                      <div className="list">
                        {visible.map((v, i) => (
                          <CarCard key={v.vehicle_id || i} v={v} rentalDays={meta?.rental_days}
                            isFav={savedIds.has(v.vehicle_id)} onToggleFav={toggleSaved} onBook={bookItem} />
                        ))}
                      </div>
                    }
                    map={(active) => (
                      <ResultsMap active={active} markers={markers} savedKeys={savedKeys} label="Car pick-up and drop-off map"
                        onToggleSave={(it) => toggleSaved(it.raw)} onBook={(it) => onBook?.(it)} onOpen={() => {}}
                        note="Rental cars are collected at the pick-up point (A), not at individual pins."
                        emptyText="This search has no map location. Set a pick-up pin with the map button in the search form." />
                    )} />
                )
              )}

              {moreError && <div className="notice err" role="alert">{moreError}</div>}
              {vehicles.length > 0 && hasMore && (
                <div className="more">
                  <button type="button" className="btn btn-ghost btn-lg" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading more… (10–20 s)" : "Load more cars"}
                  </button>
                </div>
              )}

              {meta && (
                <details className="raw">
                  <summary>Raw API response</summary>
                  <pre>{JSON.stringify({ search_metadata: meta, vehicles }, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </section>
      </div>

      <CarFilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} setFilters={setFilters}
        vehicles={vehicles} shown={visible.length} currency={meta?.currency || query?.currency} />
    </main>
  );
}
