"use client";
import Sheet from "./Sheet";
import LazyMap from "./LazyMap";
import { validLatLng } from "../lib/map";
import { AlertIcon, ExternalIcon, PinIcon, StarIcon } from "./Icons";
import { moneyExact } from "../lib/cars";
import { fmtDate } from "../lib/search";

const Row = ({ label, children }) => (children ? <><dt>{label}</dt><dd>{children}</dd></> : null);

// Full details + booking for one bike. `details` comes from useBikeSearch().
export default function BikeDetailsSheet({ details, onClose, onRetry, onBook }) {
  const { open, bike, loading, error, data } = details;
  const d = data;
  const cur = d?.currency || bike?.currency;
  const money = (n) => moneyExact(n, cur);
  const mapHref = d && d.latitude != null && d.longitude != null
    ? `https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}#map=16/${d.latitude}/${d.longitude}` : null;
  const bookHref = d?.booking_url || bike?.booking_url;

  return (
    <Sheet open={open} onClose={onClose} title={d?.name || bike?.name || "Bike details"}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
          {bookHref && (
            <a className="btn btn-primary grow" href={bookHref} target="_blank" rel="noopener noreferrer" onClick={() => onBook?.(bike, bookHref)}>
              Book now <ExternalIcon width={14} height={14} />
            </a>
          )}
        </>
      }>
      {loading && (
        <div aria-busy="true" aria-live="polite">
          <p className="muted small">Loading details… usually a few seconds.</p>
          <div className="sk sk-line" style={{ height: 160, borderRadius: 16, marginBottom: 12 }} />
          <div className="sk sk-line" style={{ width: "70%", marginBottom: 8 }} />
          <div className="sk sk-line" style={{ width: "50%", marginBottom: 8 }} />
          <div className="sk sk-line" style={{ width: "85%" }} />
        </div>
      )}

      {error && (
        <div className="state err" role="alert">
          <AlertIcon width={26} height={26} />
          <h2>Couldn’t load details</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => onRetry(bike)}>Try again</button>
        </div>
      )}

      {d && (
        <div className="bike-details">
          {d.images.length > 0 && (
            <div className="gallery" role="group" aria-label="Photos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.images.map((u) => <img key={u} src={u} alt="" loading="lazy" referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />)}
            </div>
          )}

          <p className="muted small">
            {[d.bike_type, d.rental_company].filter(Boolean).join(" · ")}
            {d.rental_company_rating != null && <span className="car-rating"> <StarIcon width={12} height={12} /> {d.rental_company_rating}</span>}
          </p>
          {d.pickup_date && d.return_date && (
            <p className="muted small">
              {fmtDate(d.pickup_date)} {d.pickup_time} – {fmtDate(d.return_date)} {d.return_time}
              {d.rental_days ? ` · ${d.rental_days} day${d.rental_days === 1 ? "" : "s"}` : ""}
            </p>
          )}
          {d.description && <p className="bike-desc">{d.description}</p>}

          <fieldset className="group">
            <legend>Price</legend>
            <dl className="kv">
              <Row label="Per day">{money(d.price_per_day)}</Row>
              <Row label="Total">{money(d.total_price)}</Row>
              <Row label="Pay now">{money(d.pay_now)}</Row>
              <Row label="Pay on arrival">{money(d.pay_on_arrival)}</Row>
              <Row label="Deposit">{d.deposit}</Row>
            </dl>
          </fieldset>

          <fieldset className="group">
            <legend>Bike &amp; rider</legend>
            <dl className="kv">
              <Row label="Engine">{d.engine_capacity != null ? `${d.engine_capacity} cc` : null}</Row>
              <Row label="Transmission">{d.transmission}</Row>
              <Row label="Fuel">{d.fuel_type}</Row>
              <Row label="Passengers">{d.passenger_capacity}</Row>
              <Row label="Licence required">{d.required_license}</Row>
              <Row label="Minimum age">{d.minimum_rider_age}</Row>
              <Row label="Mileage">{d.included_mileage}</Row>
              <Row label="Available units">{d.available_units}</Row>
            </dl>
          </fieldset>

          {d.included_equipment.length > 0 && (
            <fieldset className="group">
              <legend>Included</legend>
              <ul className="plain-list">{d.included_equipment.map((x) => <li key={x}>{x}</li>)}</ul>
            </fieldset>
          )}

          {d.optional_extras.length > 0 && (
            <fieldset className="group">
              <legend>Optional extras</legend>
              <ul className="plain-list extras">
                {d.optional_extras.map((x) => (
                  <li key={x.name}>
                    <span>{x.name}</span>
                    <span className="muted">
                      {x.free ? "Free" : x.price != null ? `${moneyExact(x.price, x.currency || cur)}${x.per_day ? " / day" : ""}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <fieldset className="group">
            <legend>Terms</legend>
            <dl className="kv">
              <Row label="Insurance">{d.insurance_information}</Row>
              <Row label="Cancellation">{d.cancellation_policy}</Row>
              <Row label="Booking">{d.booking_mode}</Row>
              <Row label="Payment methods">{d.payment_methods}</Row>
            </dl>
            {d.rental_company_terms && (
              <details className="policies"><summary>Rental company terms</summary><p>{d.rental_company_terms}</p></details>
            )}
          </fieldset>

          {(d.pickup_location || d.opening_hours) && (
            <fieldset className="group">
              <legend>Pickup</legend>
              <dl className="kv">
                <Row label="Address">{d.pickup_location}</Row>
                <Row label="Opening hours">{d.opening_hours}</Row>
              </dl>
              {validLatLng(d.latitude, d.longitude) && (
                <LazyMap label="Pick-up point map"
                  markers={[{ id: "bike-pickup", lat: d.latitude, lng: d.longitude, kind: "pickup", label: "A", title: d.pickup_location || "Pick-up point" }]} />
              )}
              {mapHref && (
                <a className="link-sm" href={mapHref} target="_blank" rel="noopener noreferrer">
                  <PinIcon width={14} height={14} /> View on map <ExternalIcon width={13} height={13} />
                </a>
              )}
            </fieldset>
          )}
        </div>
      )}
    </Sheet>
  );
}
