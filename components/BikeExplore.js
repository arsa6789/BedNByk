"use client";
import { useMemo, useState } from "react";
import BikeSearchForm from "./BikeSearchForm";
import BikeCard from "./BikeCard";
import BikeSkeleton from "./BikeSkeleton";
import BikeFilterSheet from "./BikeFilterSheet";
import ViewToggle from "./ViewToggle";
import ListMapView from "./ListMapView";
import ResultsMap from "./ResultsMap";
import { HeartIcon, SearchIcon, SlidersIcon, AlertIcon, BikeIcon, ChevronIcon } from "./Icons";
import { BIKE_POPULAR, countBikeFilters } from "../lib/bikes";
import { fmtDate } from "../lib/search";
import { toItem } from "../lib/feed";
import { bikeMarkers } from "../lib/map";
import { useBikePlaces } from "../lib/useBikePlaces";

// The whole Bike Rentals explore tab. All state comes from useBikeSearch() (owned by page.js).
export default function BikeExplore({ bikes: s, filtersOpen, setFiltersOpen, onBook }) {
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState("list");
  const filterCount = countBikeFilters(s.filters);
  const showCard = !s.hasSearched || editing;

  async function run(f = s.form) {
    const started = await s.search(f);
    if (started) { setEditing(false); setView("list"); window.scrollTo({ top: 0 }); } else { setEditing(true); }
  }
  const popular = (name) => { const next = { ...s.form, destination: name, destinationPin: null }; s.setForm(next); run(next); };

  // Bike results only have a text address, so shops are placed on the map by looking the address up (only when the map is open).
  const mapItems = useMemo(() => s.visible.map((b) => toItem("bike", b)), [s.visible]);
  const addresses = useMemo(() => mapItems.map((it) => it.address), [mapItems]);
  const { places, total, done, failed, loading: placing } = useBikePlaces(addresses, s.meta?.resolved_location || s.query?.destination || "", view === "map");
  const markers = useMemo(() => bikeMarkers(mapItems, places), [mapItems, places]);
  const savedKeys = useMemo(() => new Set([...s.savedIds].map((id) => `bike:${id}`)), [s.savedIds]);
  const mapNote = placing ? `Placing bike shops on the map… ${done}/${total}`
    : failed ? `${failed} of ${total} pick-up addresses couldn’t be placed on the map.` : "";

  return (
    <main className="explore">
      <div className="explore-head">
        <h1>Two wheels, your pace</h1>
        <p className="lede">Rent bicycles, scooters and motorcycles by city and dates, then book on BikesBooking.com.</p>
      </div>

      <div className="explore-grid">
        <aside className="side">
          {s.hasSearched && !editing && s.query && (
            <button type="button" className="summary-pill" onClick={() => setEditing(true)} aria-label="Edit your search">
              <SearchIcon />
              <span className="summary-text">
                <strong>{s.query.destination}</strong>
                <span>{fmtDate(s.query.pickup_date)} – {fmtDate(s.query.return_date)}{s.query.bike_type ? ` · ${s.query.bike_type}` : ""}</span>
              </span>
              <span className="summary-edit">Edit</span>
            </button>
          )}
          <div className={`search-card${showCard ? " is-open" : ""}`}>
            <BikeSearchForm form={s.form} setForm={s.setForm} onSubmit={() => run()}
              onOpenFilters={() => setFiltersOpen(true)} filterCount={filterCount} loading={s.loading} error={s.formError} />
            {s.hasSearched && editing && (
              <button type="button" className="btn btn-ghost btn-block collapse-btn" onClick={() => setEditing(false)}>
                <ChevronIcon style={{ transform: "rotate(180deg)" }} /> Hide search
              </button>
            )}
          </div>
        </aside>

        <section className="results" aria-label="Bike search results" aria-busy={s.loading}>
          {!s.hasSearched && (
            <div className="empty">
              <span className="empty-icon" aria-hidden="true"><BikeIcon width={28} height={28} /></span>
              <h2>Where do you want to ride?</h2>
              <p className="muted">Enter a city and your dates, or start with a popular one.</p>
              <div className="chips center">
                {BIKE_POPULAR.map((d) => <button type="button" key={d} className="chip" onClick={() => popular(d)}>{d}</button>)}
              </div>
            </div>
          )}

          {s.hasSearched && (
            <>
              <div className="toolbar">
                <div className="chips" role="group" aria-label="Sort and quick filters">
                  <button type="button" className="chip" aria-pressed={s.sort === ""} onClick={() => s.setSort("")}>Best match</button>
                  <button type="button" className="chip" aria-pressed={s.sort === "price"} onClick={() => s.setSort("price")}>Lowest price</button>
                  <button type="button" className="chip" aria-pressed={s.sort === "rating"} onClick={() => s.setSort("rating")}>Top rated shop</button>
                  <span className="chip-sep" aria-hidden="true" />
                  <button type="button" className="chip" aria-pressed={s.onlySaved} onClick={() => s.setOnlySaved((v) => !v)}>
                    <HeartIcon width={15} height={15} filled={s.onlySaved} /> Saved
                  </button>
                  <button type="button" className="chip chip-filters" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)}
                    aria-label={`Filters${filterCount ? `, ${filterCount} active` : ""}`}>
                    <SlidersIcon width={15} height={15} /> Filters{filterCount > 0 ? ` · ${filterCount}` : ""}
                  </button>
                </div>
                {s.bikes.length > 0 && <ViewToggle view={view} onChange={setView} />}
              </div>

              {s.meta && (
                <div className="result-meta">
                  <p className="muted">
                    <strong>{s.meta.resolved_location || s.query?.destination}</strong>
                    {s.meta.rental_days ? ` · ${s.meta.rental_days} day${s.meta.rental_days === 1 ? "" : "s"}` : ""}
                    {s.meta.total_matching != null ? ` · ${s.meta.total_matching.toLocaleString()} bikes` : ""}
                    {s.bikes.length ? ` · showing ${s.visible.length} of ${s.bikes.length} loaded` : ""}
                  </p>
                  {filterCount > 0 && (
                    <div className="applied">
                      <span className="tag">{filterCount} filter{filterCount === 1 ? "" : "s"} on</span>
                      <button type="button" className="link-btn" onClick={() => setFiltersOpen(true)}>Edit filters</button>
                    </div>
                  )}
                </div>
              )}

              <div role="status" aria-live="polite" className="sr-only">
                {s.loading ? "Searching BikesBooking" : s.meta ? `${s.visible.length} bikes shown` : ""}
              </div>

              {s.loading && (
                <>
                  <p className="muted small loading-note">Searching BikesBooking… usually a few seconds.</p>
                  <div className="list">{[0, 1, 2, 3].map((i) => <BikeSkeleton key={i} />)}</div>
                </>
              )}

              {s.notice?.kind === "error" && (
                <div className="state err" role="alert">
                  <AlertIcon width={26} height={26} />
                  <h2>Something went wrong</h2>
                  <p>{s.notice.message}</p>
                  <div className="state-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>Change search</button>
                    <button type="button" className="btn btn-primary" onClick={() => run()}>Try again</button>
                  </div>
                </div>
              )}

              {s.notice?.kind === "empty" && (
                <div className="state">
                  <SearchIcon width={26} height={26} />
                  <h2>No bikes found</h2>
                  <p>{s.notice.message}</p>
                  <div className="state-actions">
                    {filterCount > 0 && <button type="button" className="btn btn-ghost" onClick={() => setFiltersOpen(true)}>Edit filters</button>}
                    <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Change search</button>
                  </div>
                </div>
              )}

              {s.bikes.length > 0 && (
                s.visible.length === 0 ? (
                  <div className="state">
                    <SlidersIcon width={26} height={26} />
                    <h2>No loaded bikes are saved</h2>
                    <p>Turn off “Saved” to see all loaded bikes.</p>
                    <button type="button" className="btn btn-primary" onClick={() => s.setOnlySaved(false)}>Show all</button>
                  </div>
                ) : (
                  <ListMapView view={view}
                    list={
                      <div className="list">
                        {s.visible.map((b, i) => (
                          <BikeCard key={b.bike_id || i} b={b} rentalDays={s.meta?.rental_days}
                            isFav={s.savedIds.has(b.bike_id)} onToggleFav={s.toggleSaved} onDetails={s.openDetails} />
                        ))}
                      </div>
                    }
                    map={(active) => (
                      <ResultsMap active={active} markers={markers} savedKeys={savedKeys} label="Bike shops map"
                        onToggleSave={(it) => s.toggleSaved(it.raw)} onBook={(it) => onBook?.(it)} onOpen={(it) => s.openDetails(it.raw)}
                        note={mapNote} emptyText={placing ? "Placing bike shops on the map…" : "None of these pick-up addresses could be placed on the map."} />
                    )} />
                )
              )}

              {s.moreError && <div className="notice err" role="alert">{s.moreError}</div>}
              {s.bikes.length > 0 && s.hasMore && (
                <div className="more">
                  <button type="button" className="btn btn-ghost btn-lg" onClick={s.loadMore} disabled={s.loadingMore}>
                    {s.loadingMore ? "Loading more…" : "Load more bikes"}
                  </button>
                </div>
              )}

              {s.meta && s.bikes.length > 0 && (
                <details className="raw">
                  <summary>Raw API response</summary>
                  <pre>{JSON.stringify({ search_metadata: s.meta, bikes: s.bikes }, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </section>
      </div>

      <BikeFilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={s.filters} setFilters={s.setFilters}
        hasSearched={s.hasSearched} currency={s.form.currency}
        onApply={() => { setFiltersOpen(false); if (s.hasSearched) run(); }} />
    </main>
  );
}
