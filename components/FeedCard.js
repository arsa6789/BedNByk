"use client";
import { useState } from "react";
import ItemAction from "./ItemAction";
import { HeartIcon, StarIcon, CheckIcon, BedIcon, CarIcon, BikeIcon } from "./Icons";

const PLACEHOLDER = { hotel: BedIcon, car: CarIcon, bike: BikeIcon };
const NOUN = { hotel: "stay", car: "car", bike: "bike" };

// Compact vertical card used in the homepage carousels. Works for hotels, cars and bikes.
export default function FeedCard({ item, isFav, onToggleFav, onOpen, onBook, showKind = false }) {
  const [failed, setFailed] = useState(false);
  const Ph = PLACEHOLDER[item.kind];
  const hasImage = item.image && !failed;
  const action = item.kind === "bike" ? "Details" : item.href ? "Book" : "";

  return (
    <article className="feed-card" data-kind={item.kind}>
      <ItemAction item={item} onOpen={onOpen} onBook={onBook} className="feed-main"
        aria-label={action ? `${action}: ${item.title}` : undefined}>
        <span className={`feed-media${hasImage ? "" : " no-img"}`}>
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
          ) : (
            <Ph className="car-ph" width={40} height={40} />
          )}
          {item.tag && <span className="media-tag"><CheckIcon width={13} height={13} /> {item.tag}</span>}
          {showKind && <span className="kind-tag">{{ hotel: "Stay", car: "Car", bike: "Bike" }[item.kind]}</span>}
        </span>
        <span className="feed-body">
          <strong className="feed-title">{item.title}</strong>
          {item.subtitle && <span className="muted small feed-sub">{item.subtitle}</span>}
          <span className="feed-meta">
            {item.rating != null && <span className="feed-rating"><StarIcon width={12} height={12} /> {item.rating}</span>}
            {item.priceText && <span className="feed-price"><b>{item.priceText}</b><span className="muted small"> / {item.unit}</span></span>}
          </span>
        </span>
      </ItemAction>
      <button type="button" className="heart feed-heart" aria-pressed={isFav}
        aria-label={isFav ? `Remove ${item.title} from saved` : `Save ${item.title} (${NOUN[item.kind]})`}
        onClick={() => onToggleFav(item)}>
        <HeartIcon width={18} height={18} filled={isFav} />
      </button>
    </article>
  );
}
