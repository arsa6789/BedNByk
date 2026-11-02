import { HomeIcon, CompassIcon, HeartIcon, HistoryIcon } from "./Icons";

// Floating pill on phones, moves to the top-right on desktop (see .nav in globals.css).
// Four places: Home (live picks), Explore (search), Saved, History.
export default function BottomNav({ tab, onTab, savedCount = 0, savedNoun = "stays" }) {
  const item = (id, label, Icon, extra, aria) => (
    <button type="button" className="nav-item" data-tab={id} aria-label={aria || label}
      aria-current={tab === id ? "page" : undefined} onClick={() => onTab(id)}>
      <Icon width={22} height={22} {...(id === "saved" ? { filled: tab === "saved" } : {})} />
      <span className="nav-label">{label}</span>
      {extra}
    </button>
  );
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-pill">
        {item("home", "Home", HomeIcon)}
        {item("explore", "Explore", CompassIcon)}
        {item("saved", "Saved", HeartIcon,
          savedCount > 0 && <b className="nav-badge" aria-hidden="true">{savedCount > 9 ? "9+" : savedCount}</b>,
          `Saved${savedCount ? `, ${savedCount} ${savedNoun}` : ""}`)}
        {item("history", "History", HistoryIcon)}
      </div>
    </nav>
  );
}
