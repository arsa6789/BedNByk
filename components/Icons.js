// Small inline icon set (no icon library is installed, so no new dependency).
const base = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false",
};
const I = (children) => function Icon(props) { return <svg {...base} {...props}>{children}</svg>; };

export const SearchIcon = I(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>);
export const PinIcon = I(<><path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.4" /></>);
export const CalendarIcon = I(<><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>);
export const UsersIcon = I(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 20c.4-3.4 2.7-5.2 6-5.2s5.6 1.8 6 5.2" /><path d="M16 5.6a3 3 0 0 1 0 5.8M18 14.9c1.8.6 3 2.2 3.2 4.6" /></>);
export const SlidersIcon = I(<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>);
export const CompassIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></>);
export const BedIcon = I(<><path d="M3 18V7M3 14h18v4M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5" /><circle cx="7" cy="11" r="1.6" /></>);
export const ChevronIcon = I(<path d="M6 9l6 6 6-6" />);
export const CloseIcon = I(<path d="M6 6l12 12M18 6L6 18" />);
export const CheckIcon = I(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const AlertIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></>);
export const ExternalIcon = I(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>);
export const HeartIcon = ({ filled, ...p }) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5s-7.8-4.7-9.4-9.6C1.5 7.6 3.4 4.5 6.7 4.5c2 0 3.5 1 5.3 2.9 1.8-1.9 3.3-2.9 5.3-2.9 3.3 0 5.2 3.1 4.1 6.4-1.6 4.9-9.4 9.6-9.4 9.6z" />
  </svg>
);
export const StarIcon = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9L12 2.8z" />
  </svg>
);
export const CarIcon = I(<><path d="M5 16V12l1.7-4.6A2 2 0 0 1 8.6 6h6.8a2 2 0 0 1 1.9 1.4L19 12v4M3.5 16h17M5 16v2.5M19 16v2.5" /><circle cx="8" cy="13" r="1" /><circle cx="16" cy="13" r="1" /><path d="M5.5 12h13" /></>);
export const SuitcaseIcon = I(<><rect x="4" y="7.5" width="16" height="12" rx="2.5" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M9 11v5M15 11v5" /></>);
export const GearIcon = I(<><circle cx="6" cy="6" r="1.8" /><circle cx="18" cy="6" r="1.8" /><circle cx="6" cy="18" r="1.8" /><circle cx="12" cy="12" r="1.8" /><path d="M6 8v8M12 13.8V18M18 8v2.2a2 2 0 0 1-2 2h-4M12 10.2V6" /></>);
export const SnowIcon = I(<><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 6.5l2.5-2M9.5 19.5L12 17.5l2.5 2" /></>);
export const ClockIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const BikeIcon = I(<><circle cx="6" cy="16" r="3.5" /><circle cx="18" cy="16" r="3.5" /><path d="M6 16l3.5-7h5M12 16l-2.5-7M14.5 9L18 16M13 6h2.5" /></>);
export const InfoIcon = I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const HomeIcon = I(<><path d="M4 11.2L12 4l8 7.2" /><path d="M6 10v9.5h4.2v-5h3.6v5H18V10" /></>);
export const HistoryIcon = I(<><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4.5v4h4" /><path d="M12 7.5V12l3 2" /></>);
export const MapIcon = I(<><path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2z" /><path d="M9 4.5v13M15 6.5v13" /></>);
export const ListIcon = I(<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" />);
export const TrashIcon = I(<><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.5h9.4L17.5 7" /><path d="M10 11v5M14 11v5" /></>);
export const RefreshIcon = I(<><path d="M20 11a8 8 0 0 0-14-4.5L4 9" /><path d="M4 4.5V9h4.5" /><path d="M4 13a8 8 0 0 0 14 4.5L20 15" /><path d="M20 19.5V15h-4.5" /></>);
