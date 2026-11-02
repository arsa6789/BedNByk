"use client";
import { useState } from "react";
import { PinIcon, HeartIcon, StarIcon, CheckIcon, ExternalIcon } from "./Icons";
import { money, fmtDate } from "../lib/search";

const safe = (u) => (/^https:\/\//.test(u || "") ? u : null);

// Premium photographic card. Every field is optional: anything the API didn't return is simply hidden.
export default function HotelCard({ p, fallbackCurrency, nights, isFav, onToggleFav, onBook }) {
  const [imgFailed, setImgFailed] = useState(false);
  const room = p.available_rooms?.[0] || {};
  const cur = p.currency || room.currency || fallbackCurrency;
  const bookHref = safe(room.checkout_url) || safe(p.booking_url);
  const detailsHref = safe(p.booking_url) || safe(p.url);
  const place = p.display_location || p.city;
  const hasImage = p.thumbnail && !imgFailed;
  const cancelUntil = room.free_cancellation_until
    ? fmtDate(room.free_cancellation_until.slice(0, 10), { month: "short", day: "numeric" })
    : null;
  const perNight = money(p.price_per_night, cur);
  const total = money(p.total_price, cur);
  const fees = p.excluded_taxes_and_fees ? money(p.excluded_taxes_and_fees, cur) : null;

  return (
    <article className="hotel">
      <div className={`media${hasImage ? "" : " no-img"}`}>
        {hasImage && (
          // Plain <img>: works in the static Capacitor export without extra Next.js image config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.thumbnail} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)} />
        )}
        <div className="scrim" aria-hidden="true" />

        {p.has_free_cancellation && (
          <span className="media-tag"><CheckIcon width={14} height={14} /> Free cancellation</span>
        )}
        <button type="button" className="heart" aria-pressed={isFav}
          aria-label={isFav ? `Remove ${p.name} from saved` : `Save ${p.name}`}
          onClick={() => onToggleFav(p)}>
          <HeartIcon width={20} height={20} filled={isFav} />
        </button>

        <div className="media-text">
          <h3>{p.name}</h3>
          {(place || p.distance_from_center) && (
            <p><PinIcon width={14} height={14} /> {[place, p.distance_from_center].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </div>

      <div className="hotel-body">
        {(p.rating_score != null || p.star_rating) && (
          <div className="rating-row">
            {p.rating_score != null && <span className="score">{p.rating_score}</span>}
            {p.rating_score != null && (
              <span className="rating-text">
                {p.rating_text}{p.reviews_count ? <span className="muted"> · {p.reviews_count.toLocaleString()} reviews</span> : null}
              </span>
            )}
            {p.star_rating ? (
              <span className="stars" role="img" aria-label={`${p.star_rating}-star hotel`}>
                {Array.from({ length: p.star_rating }, (_, i) => <StarIcon key={i} width={13} height={13} />)}
              </span>
            ) : null}
          </div>
        )}

        {(room.name || room.bed_type) && (
          <p className="room">{[room.name, room.bed_type].filter(Boolean).join(" · ")}</p>
        )}

        {(p.no_prepayment || cancelUntil || p.is_sold_out) && (
          <div className="tags">
            {p.is_sold_out && <span className="tag warn">Sold out for these dates</span>}
            {p.has_free_cancellation && cancelUntil && <span className="tag ok">Cancel free until {cancelUntil}</span>}
            {p.no_prepayment && <span className="tag">No prepayment</span>}
          </div>
        )}

        <div className="price-row">
          <div className="price-block">
            {perNight && <div><span className="price">{perNight}</span><span className="muted"> / night</span></div>}
            {total && (
              <div className="muted small">
                {total} total{nights ? ` · ${nights} night${nights === 1 ? "" : "s"}` : ""}
              </div>
            )}
            {fees && <div className="muted small">+ {fees} taxes &amp; fees</div>}
          </div>
          <div className="card-actions">
            {bookHref && (
              <a className="btn btn-primary" href={bookHref} target="_blank" rel="noopener noreferrer" onClick={() => onBook?.(p)}>
                {p.is_sold_out ? "View" : "Book now"}
              </a>
            )}
            {detailsHref && detailsHref !== bookHref && (
              <a className="link-sm" href={detailsHref} target="_blank" rel="noopener noreferrer">
                Details <ExternalIcon width={13} height={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
