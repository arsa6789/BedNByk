"use client";
import { useState } from "react";
import { HeartIcon, CheckIcon, StarIcon, GearIcon, UsersIcon, BikeIcon, InfoIcon } from "./Icons";
import { moneyExact } from "../lib/cars";
import { isFreeCancel } from "../lib/bikes";
import { fmtDate } from "../lib/search";

// Every field is optional: anything the API didn't return is simply hidden.
export default function BikeCard({ b, rentalDays, isFav, onToggleFav, onDetails }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = b.image_url && !imgFailed;
  const name = b.name || b.bike_type || "Rental bike";
  const perDay = moneyExact(b.price_per_day, b.currency);
  const total = moneyExact(b.total_price, b.currency);
  const days = rentalDays || b.trip?.rental_days;
  const specs = [
    b.engine_capacity != null && { Icon: GearIcon, text: `${b.engine_capacity} cc` },
    b.transmission && { Icon: GearIcon, text: b.transmission },
    b.minimum_rider_age != null && { Icon: UsersIcon, text: `Age ${b.minimum_rider_age}+` },
    b.required_license && { Icon: InfoIcon, text: `Licence ${b.required_license}` },
  ].filter(Boolean);

  return (
    <article className="hotel car">
      <div className={`media car-media${hasImage ? "" : " no-img"}`}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.image_url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
        ) : (
          <BikeIcon className="car-ph" width={56} height={56} />
        )}
        {isFreeCancel(b) && <span className="media-tag"><CheckIcon width={14} height={14} /> Free cancellation</span>}
        {b.bike_id && (
          <button type="button" className="heart" aria-pressed={isFav}
            aria-label={isFav ? `Remove ${name} from saved` : `Save ${name}`} onClick={() => onToggleFav(b)}>
            <HeartIcon width={20} height={20} filled={isFav} />
          </button>
        )}
      </div>

      <div className="hotel-body">
        <div>
          <h3 className="car-name">{name}</h3>
          {(b.bike_type || b.rental_company) && (
            <p className="muted small">
              {[b.bike_type, b.rental_company].filter(Boolean).join(" · ")}
              {b.rental_company_rating != null && <span className="car-rating"> <StarIcon width={12} height={12} /> {b.rental_company_rating}</span>}
            </p>
          )}
          {b.pickup_location && <p className="muted small">{b.pickup_location}</p>}
          {b.trip && (
            <p className="muted small">
              {b.trip.city}{b.trip.pickup_date ? ` · ${fmtDate(b.trip.pickup_date)}` : ""}{b.trip.return_date ? ` – ${fmtDate(b.trip.return_date)}` : ""}
            </p>
          )}
        </div>

        {specs.length > 0 && (
          <ul className="specs">{specs.map(({ Icon, text }) => <li key={text}><Icon width={16} height={16} /> {text}</li>)}</ul>
        )}

        {(b.deposit || b.included_mileage) && (
          <div className="tags">
            {b.deposit && <span className="tag">Deposit: {b.deposit}</span>}
            {b.included_mileage && <span className="tag">{b.included_mileage}</span>}
          </div>
        )}

        <div className="price-row">
          <div className="price-block">
            {perDay && <div><span className="price">{perDay}</span><span className="muted"> / day</span></div>}
            {total && <div className="muted small">{total} total{days ? ` · ${days} day${days === 1 ? "" : "s"}` : ""}</div>}
          </div>
          <div className="card-actions">
            {b.bike_id && (
              <button type="button" className="btn btn-primary" onClick={() => onDetails(b)}>Details &amp; book</button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
