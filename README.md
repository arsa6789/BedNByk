# BedNByk (formerly StayFinder)

Mobile-first hotel and car-rental search. Next.js (App Router, JavaScript) plus small server routes that call
the Notte **Anything API** "Booking.com Hotel Search" and "Rentalcars.com Car Rental Search" functions.
Packs into an Android/iOS app with Capacitor.

```
Hotels:      Browser / Capacitor app -> /api/search       (your Vercel server, holds the key) -> Anything API -> Booking.com
Car rentals: Browser / Capacitor app -> /api/cars/search  (same server, same NOTTE_API_KEY)    -> Anything API -> Rentalcars.com
Bike rentals: Browser / Capacitor app -> /api/bikes/search + /api/bikes/details (same server, same key)   -> Anything API -> BikesBooking.com
```

## Why a server route?
Your Notte API key must never be in frontend code (anyone could read it and spend your credits).
`app/api/search/route.js` keeps it on the server. The UI only ever talks to `/api/search`.

## 1. Run locally
```bash
npm install
cp .env.example .env.local      # put your NOTTE_API_KEY inside (https://console.notte.cc)
npm run dev                     # http://localhost:3000
```

## 2. Deploy to Vercel
1. Push this folder to GitHub.
2. Vercel -> Add New Project -> import the repo (framework: Next.js, no settings to change).
3. Settings -> Environment Variables -> add `NOTTE_API_KEY`.
4. Deploy, then open your `https://<project>.vercel.app` URL.

## 3. Android app with Capacitor
Deploy to Vercel first: the app is static files and calls your deployed `/api/search`.
```bash
# Mac/Linux
NEXT_PUBLIC_API_BASE=https://<project>.vercel.app npm run build:cap
# Windows PowerShell
$env:NEXT_PUBLIC_API_BASE="https://<project>.vercel.app"; npm run build:cap

npm i @capacitor/android            # (@capacitor/ios on a Mac)
npx cap add android                 # once
npx cap sync android                # after every build:cap
npx cap open android                # Android Studio -> Run / Build APK
```
`build:cap` temporarily moves `app/api` aside (static export cannot contain API routes), builds into `out/`, then restores it.
If it is ever interrupted, move `.api-backup` back to `app/api`.

## Project structure
```
app/
  api/search/route.js     hotel server route (unchanged): validates input, calls Notte with your key
  api/cars/search/route.js car server route: validates/normalises input, calls Notte, whitelists the response
  api/bikes/search/route.js, api/bikes/details/route.js   bike server routes (same pattern)
  page.js                 app shell: splash, 4 tabs (Home / Explore / Saved / History), wiring between them
  layout.js, not-found.js, icon.svg
  globals.css             design tokens + all styles (mobile-first)
components/
  SearchForm.js           destination, dates, guests/rooms, filters button
  FilterSheet.js          price, stars, currency, free cancellation (bottom sheet / dialog)
  Sheet.js                accessible modal: focus trap, Escape, scroll lock
  HotelCard.js            photographic result card (hides any missing field)
  HotelSkeleton.js        loading placeholder with the same shape as a card
  BottomNav.js            floating nav: Home / Explore / Saved / History (top-right on desktop)
  Icons.js                inline SVG icons (no icon dependency)
  ModeSwitch.js           Hotels / Car Rentals switch
  CarExplore.js           car-rental tab: form, toolbar, results, states, load more
  CarSearchForm.js, CarCard.js, CarSkeleton.js, CarFilterSheet.js
  BikeExplore.js, BikeSearchForm.js, BikeCard.js, BikeSkeleton.js, BikeFilterSheet.js, BikeDetailsSheet.js
  HotelExplore.js         hotel tab (moved out of page.js, same behaviour)
  HomeFeed.js             Home: city + category chips, carousels, "continue where you left off", map button
  FeedCard.js, ItemRow.js, ItemAction.js   one card shape for hotels / cars / bikes
  TripPlanner.js          Home card: set car pick-up / drop-off with map pins
  HistoryTab.js           recent searches + booking pages opened
  MapView.js (Leaflet), LazyMap.js (client-only loader), ResultsMap.js, ListMapView.js, ViewToggle.js, FeedMapSheet.js
  LocationPicker.js       sheet: search a place, tap the map, drag the pin, use my location
lib/feed.js, lib/useFeed.js          feed cities, request payloads, unified item shape, cached loading
lib/history.js, lib/useHistory.js    history storage (`stayfinder:history:v1`), re-run helpers
lib/map.js, lib/useBikePlaces.js     OpenStreetMap geocoding (throttled + cached), marker builders
lib/useHotelSearch.js                hotel search state (moved out of page.js)
lib/search.js             hotel defaults, validation, request payload builder, formatters
lib/cars.js               car defaults, validation, payload, client-side filters/sorting
lib/useCarSearch.js       car search state + saved cars (localStorage `stayfinder:saved-cars:v1`)
lib/bikes.js, lib/useBikeSearch.js   bike helpers, state, saved bikes, details loading
lib/server/notte.js       server-only MCP helper used by the car and bike routes
lib/server/validate.js    server-only input/output helpers used by the bike routes
scripts/build-cap.mjs     static build for Capacitor
```

## Branding
- Logo files: `public/brand/logo.png` (full logo, used on the splash), `public/brand/mark.png` (mountain + bike mark, topbar and splash pattern), `app/icon.png` (favicon).
- The splash (`Splash` in `app/page.js`) fills its progress bar over `SPLASH_MS`; keep it in sync with the `.splash-fill` animation duration in `globals.css`.
- Logo images have a white background and are blended with `mix-blend-mode: multiply`; the topbar mark sits on a white tile so it stays readable in dark mode.
- Android's native launcher icon and system splash are separate from this in-app splash (see below).

## Design notes
- Tokens (colours, radii, 8px spacing) live at the top of `globals.css`. Change `--accent` to re-theme everything.
- Breakpoints: 480 (dates side by side), 700 (dialogs, wider padding), 900 (nav moves to the top), 1024 (search becomes a sticky sidebar).
- Dark mode and reduced-motion are handled with media queries.
- Saved hotels are stored in `localStorage` (`stayfinder:saved:v2`) on the device only.

## Car rentals: how it works and limits
- No new environment variable: the car route reuses `NOTTE_API_KEY` (set it once in Vercel / `.env.local`).
- Request: pickup location, optional return location, pickup/return date and time (30-min steps), driver age (18-99), currency (USD/EUR/GBP/PKR), page.
- Locations are free text matched by Rentalcars autocomplete; unknown places return `LOCATION_NOT_FOUND`.
- A search takes ~10-15 s and returns up to 25 cars per page, 500 cars max (20 pages). "Load more cars" fetches the next page.
- The function has **no server-side filters or sorting**, so the Filters sheet (transmission, car type, seats, max price, free cancellation, A/C) and the sort chips only narrow/reorder the cars already loaded.
- Cars only show what the API returns; missing fields (e.g. doors, supplier rating) are hidden.
- Saved cars are stored separately from saved hotels, with the trip dates they were found for.

## Bike rentals: how it works and limits
- Uses two Anything API functions: `search_rental_bikes` (`53d4138a-…`) for results and `get_bike_rental_details` (`abd95083-…`) for the "Details & book" sheet (pay-now split, extras, equipment, terms, opening hours, map link, booking link). Same `NOTTE_API_KEY`; no new variable.
- Server routes: `app/api/bikes/search/route.js` and `app/api/bikes/details/route.js` (validate input, whitelist the response, never expose the key).
- Search is fast (about 2-5 s). Filters (bike type, transmission, price, engine size, currency) run **on the function's side**, 20 bikes per page, "Load more bikes" fetches the next page. Sorting (lowest price / top rated shop) only reorders the bikes already loaded.
- Bike types: bicycle, e-bike, scooter, moped, motorcycle, touring, adventure, cruiser, quad. Currencies: EUR, USD, GBP, CHF, RUB. The return date must be at least one day after pickup.
- Engine size and transmission are only known when the listing states them, so those filters hide bikes without that info.
- Booking happens on BikesBooking.com through the returned link; the app does not take payments.
- Saved bikes use their own key (`stayfinder:saved-bikes:v1`), with the trip dates stored.

## Home feed
- Home shows live picks for one city (Barcelona, Rome, Lisbon or Athens; remembered on the device): cars, bikes, hotels and a "Popular & top rated" row built from whatever has loaded (all three score out of 10). Chips (All / Cars / Bikes / Hotels / Top rated) filter instantly.
- It reuses the existing routes (`/api/search`, `/api/cars/search`, `/api/bikes/search`) with dates 30 days ahead, in EUR. **No new server code or env vars.**
- **Credits:** each section is a real search. To save credits, sections load only when they scroll near the screen, results are cached on the device for 30 minutes, and a city switch loads again only what is not cached. A fresh visit can cost up to 3 searches. Cars take about 10-15 s.
- "See all" runs the normal search for that city/dates in Explore. Edit the cities in `lib/feed.js`.

## Maps
- Leaflet + OpenStreetMap tiles + Nominatim (free, no key). Usage rules: keep the attribution (already shown), do not hammer the servers (the app looks addresses up one per second and caches them), and for heavy traffic use your own tile provider / geocoder.
- **Pins fill text fields.** The booking services accept place *names*, not coordinates. A pin is turned into a name (reverse geocoding) and that name goes into the form. For cars, if Rentalcars does not know the exact address, the search is retried once with the pin's city.
- List/Map toggle on results. Hotels use their real coordinates. Cars show the pick-up (A) and drop-off (B) points the search resolved (cars have no per-car location). Bike results only have a text address, so shops are placed by geocoding the first 10 distinct addresses (some may not resolve).
- In the Capacitor app, check that OpenStreetMap tiles load on a real device.

## History
- Recent searches and "booking page opened" entries live in `localStorage` (`stayfinder:history:v1`, max 40). "Search again" re-runs a search (past dates are moved forward). We only know a booking page was opened, not that a booking was completed.

## Notes
- Each search takes about 10-20 s (the function drives a real browser) and may use Notte credits.
- The in-memory rate limit is best-effort on serverless. For real traffic use Upstash Redis (free tier) or Vercel firewall rate limiting.
- Photos come from Booking.com's `thumbnail` URLs. If one fails to load the card shows a plain navy placeholder.
- Hotel and booking links come from Booking.com. This is an unofficial tool.
