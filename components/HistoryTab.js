"use client";
import { useState } from "react";
import { HistoryIcon, SearchIcon, TrashIcon, ExternalIcon, CloseIcon, BedIcon, CarIcon, BikeIcon } from "./Icons";
import { MODE_LABEL, timeAgo } from "../lib/history";

const MODE_ICON = { hotels: BedIcon, cars: CarIcon, bikes: BikeIcon };

function Thumb({ entry }) {
  const [failed, setFailed] = useState(false);
  const Icon = MODE_ICON[entry.mode] || SearchIcon;
  return (
    <span className={`item-thumb${entry.image && !failed ? "" : " no-img"}`}>
      {entry.image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : <Icon width={24} height={24} />}
    </span>
  );
}

// "My Bookings & History": recent searches (run them again) and the booking pages you opened.
export default function HistoryTab({ entries, onResume, onRemove, onClear, onHome }) {
  const [confirm, setConfirm] = useState(false);
  const searches = entries.filter((e) => e.type === "search");
  const bookings = entries.filter((e) => e.type === "booking");

  return (
    <main className="saved">
      <div className="explore-head">
        <h1>History</h1>
        <p className="lede">Your recent searches and the booking pages you opened, kept on this device only.</p>
      </div>

      {entries.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true"><HistoryIcon width={28} height={28} /></span>
          <h2>Nothing here yet</h2>
          <p className="muted">Searches you run and booking pages you open will show up here.</p>
          <button type="button" className="btn btn-primary" onClick={onHome}>Browse picks</button>
        </div>
      ) : (
        <>
          <div className="history-bar">
            <p className="muted small">We can see that you opened a booking page, but not whether you finished booking on the partner’s site.</p>
            {confirm ? (
              <span className="history-confirm">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Keep</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => { onClear(); setConfirm(false); }}>Clear all</button>
              </span>
            ) : (
              <button type="button" className="link-btn" onClick={() => setConfirm(true)}><TrashIcon width={14} height={14} /> Clear history</button>
            )}
          </div>

          {bookings.length > 0 && (
            <section className="history-group" aria-labelledby="h-bookings">
              <h2 id="h-bookings">Booking pages you opened</h2>
              <ul className="history-list">
                {bookings.map((e) => (
                  <li key={e.id} className="history-item">
                    <Thumb entry={e} />
                    <span className="item-info">
                      <strong>{e.title}</strong>
                      <span className="muted small">{[MODE_LABEL[e.mode], e.priceText].filter(Boolean).join(" · ")} · {timeAgo(e.ts)}</span>
                    </span>
                    {e.href && <a className="btn btn-ghost btn-sm" href={e.href} target="_blank" rel="noopener noreferrer">Open <ExternalIcon width={13} height={13} /></a>}
                    <button type="button" className="icon-btn" aria-label={`Remove ${e.title} from history`} onClick={() => onRemove(e.id)}><CloseIcon width={18} height={18} /></button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {searches.length > 0 && (
            <section className="history-group" aria-labelledby="h-searches">
              <h2 id="h-searches">Recent searches</h2>
              <ul className="history-list">
                {searches.map((e) => (
                  <li key={e.id} className="history-item">
                    <Thumb entry={e} />
                    <span className="item-info">
                      <strong>{e.title}</strong>
                      <span className="muted small">{[MODE_LABEL[e.mode], e.subtitle].filter(Boolean).join(" · ")} · {timeAgo(e.ts)}</span>
                    </span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => onResume(e)}>Search again</button>
                    <button type="button" className="icon-btn" aria-label={`Remove ${e.title} search from history`} onClick={() => onRemove(e.id)}><CloseIcon width={18} height={18} /></button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
