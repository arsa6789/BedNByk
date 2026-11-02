"use client";
import { useState } from "react";
import ItemAction from "./ItemAction";
import { HeartIcon, StarIcon, BedIcon, CarIcon, BikeIcon } from "./Icons";

const PLACEHOLDER = { hotel: BedIcon, car: CarIcon, bike: BikeIcon };

// Compact horizontal row (map previews). Works for hotels, cars and bikes.
export default function ItemRow({ item, isFav, onToggleFav, onOpen, onBook }) {
  const [failed, setFailed] = useState(false);
  const Ph = PLACEHOLDER[item.kind];
  const action = item.kind === "bike" ? "Details" : item.href ? "Book" : "";
  return (
    <div className="item-row">
      <span className={`item-thumb${item.image && !failed ? "" : " no-img"}`}>
        {item.image && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        ) : <Ph width={24} height={24} />}
      </span>
      <span className="item-info">
        <strong>{item.title}</strong>
        <span className="muted small">
          {item.rating != null && <><StarIcon width={11} height={11} /> {item.rating} · </>}
          {item.priceText ? `${item.priceText} / ${item.unit}` : item.subtitle}
        </span>
      </span>
      <button type="button" className="heart plain" aria-pressed={isFav} aria-label={isFav ? `Remove ${item.title} from saved` : `Save ${item.title}`}
        onClick={() => onToggleFav(item)}>
        <HeartIcon width={18} height={18} filled={isFav} />
      </button>
      {action && <ItemAction item={item} onOpen={onOpen} onBook={onBook} className="btn btn-primary btn-sm">{action}</ItemAction>}
    </div>
  );
}
