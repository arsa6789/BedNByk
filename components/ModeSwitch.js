import { BedIcon, CarIcon, BikeIcon } from "./Icons";

// Hotels / Car Rentals / Bike Rentals switch (a segmented control built from toggle buttons).
// The long label ("Rentals") is visually hidden on narrow screens; the accessible name stays complete.
export default function ModeSwitch({ mode, onChange }) {
  const items = [
    { id: "hotels", label: "Hotels", long: "", Icon: BedIcon },
    { id: "cars", label: "Car", long: " Rentals", Icon: CarIcon },
    { id: "bikes", label: "Bike", long: " Rentals", Icon: BikeIcon },
  ];
  return (
    <div className="mode-switch" role="group" aria-label="What are you looking for?">
      {items.map(({ id, label, long, Icon }) => (
        <button key={id} type="button" className="mode-btn" aria-pressed={mode === id} data-mode={id} aria-label={`${label}${long}`} onClick={() => onChange(id)}>
          <Icon width={18} height={18} /> <span>{label}<span className="mode-long">{long}</span></span>
        </button>
      ))}
    </div>
  );
}
