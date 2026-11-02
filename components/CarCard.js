"use client";
import { useState } from "react";
import { HeartIcon, CheckIcon, UsersIcon, SuitcaseIcon, GearIcon, SnowIcon, StarIcon, ExternalIcon, CarIcon } from "./Icons";
import { moneyExact, humanize } from "../lib/cars";
import { fmtDate } from "../lib/search";

// Every field is optional: anything the API didn't return is simply hidden.
export default function CarCard({ v, rentalDays, isFav, onToggleFav, onBook }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = v.image_url && !imgFailed;
  const name = v.vehicle_name || v.vehicle_category || "Rental car";
  const perDay = moneyExact(v.price_per_day, v.currency);
  const total = moneyExact(v.total_price, v.currency);
  const days = rentalDays || v.trip?.rental_days;
  const bags = v.luggage_capacity ?? v.large_suitcases;
  const hasPolicies = v.fuel_policy || v.mileage_policy || v.insurance_information || v.cancellation_policy;

  const specs = [
    v.passenger_capacity != null && { Icon: UsersIcon, text: `${v.passenger_capacity} seats` },
    bags != null && { Icon: SuitcaseIcon, text: `${bags} bag${bags === 1 ? "" : "s"}` },
    v.transmission && { Icon: GearIcon, text: v.transmission },
    v.air_conditioning === true && { Icon: SnowIcon, text: "A/C" },
    v.doors != null && { Icon: CarIcon, text: `${v.doors} doors` },
  ].filter(Boolean);

  return (
    <article className="hotel car">
      <div className={`media car-media${hasImage ? "" : " no-img"}`}>
        {hasImage ? (
          // Plain <img>: works in the static Capacitor export without extra Next.js image config.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image_url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)} />
        ) : (
          <CarIcon className="car-ph" width={56} height={56} />
        )}
        {v.free_cancellation === true && (
          <span className="media-tag"><CheckIcon width={14} height={14} /> Free cancellation</span>
        )}
        {v.vehicle_id && (
          <button type="button" className="heart" aria-pressed={isFav}
            aria-label={isFav ? `Remove ${name} from saved` : `Save ${name}`} onClick={() => onToggleFav(v)}>
            <HeartIcon width={20} height={20} filled={isFav} />
          </button>
        )}
      </div>

      <div className="hotel-body">
        <div>
          <h3 className="car-name">{name}</h3>
          {(v.vehicle_category || v.supplier_name) && (
            <p className="muted small">
              {[v.vehicle_category, v.supplier_name].filter(Boolean).join(" · ")}
              {v.supplier_rating != null && (
                <span className="car-rating"> <StarIcon width={12} height={12} /> {v.supplier_rating}</span>
              )}
            </p>
          )}
          {v.trip && (
            <p className="muted small">
              {v.trip.pickup_location}{v.trip.pickup_date ? ` · ${fmtDate(v.trip.pickup_date)}` : ""}
              {v.trip.dropoff_date ? ` – ${fmtDate(v.trip.dropoff_date)}` : ""}
            </p>
          )}
        </div>

        {specs.length > 0 && (
          <ul className="specs">
            {specs.map(({ Icon, text }) => (
              <li key={text}><Icon width={16} height={16} /> {text}</li>
            ))}
          </ul>
        )}

        {(v.pay_when || v.pickup_desk_type) && (
          <div className="tags">
            {v.pickup_desk_type && <span className="tag">{v.pickup_desk_type}</span>}
            {v.pay_when && <span className="tag">{humanize(v.pay_when)}</span>}
          </div>
        )}

        {hasPolicies && (
          <details className="policies">
            <summary>Rental conditions</summary>
            <dl>
              {v.cancellation_policy && <><dt>Cancellation</dt><dd>{v.cancellation_policy}</dd></>}
              {v.fuel_policy && <><dt>Fuel</dt><dd>{v.fuel_policy}</dd></>}
              {v.mileage_policy && <><dt>Mileage</dt><dd>{v.mileage_policy}</dd></>}
              {v.insurance_information && <><dt>Insurance &amp; deposit</dt><dd>{v.insurance_information}</dd></>}
            </dl>
          </details>
        )}

        <div className="price-row">
          <div className="price-block">
            {perDay && <div><span className="price">{perDay}</span><span className="muted"> / day</span></div>}
            {total && (
              <div className="muted small">
                {total} total{days ? ` · ${days} day${days === 1 ? "" : "s"}` : ""}
              </div>
            )}
          </div>
          <div className="card-actions">
            {v.booking_url && (
              <a className="btn btn-primary" href={v.booking_url} target="_blank" rel="noopener noreferrer" onClick={() => onBook?.(v)}>
                Book <ExternalIcon width={14} height={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
