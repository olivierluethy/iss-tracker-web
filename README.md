# ISS Tracker

A real-time web app that tracks the International Space Station on a 3D globe,
shows its live position and telemetry, and predicts when it will next fly over
your location.

## Features

- **Live position** of the ISS plotted on an interactive globe.
- **Orbit propagation** from real TLE (Two-Line Element) data using `satellite.js`.
- **Next-pass prediction** for any location you enter, including whether the pass
  is visible (sunlit satellite against a dark sky).
- **Telemetry panel** with altitude, velocity, and ground-track coordinates.
- **Location lookup** via geocoding so you can search by place name.
- Educational facts and a starfield backdrop for a polished feel.

## Tech

- [Next.js](https://nextjs.org) 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4, Framer Motion, lucide-react icons
- `satellite.js` for orbital mechanics, `d3-geo` / `topojson-client` / `world-atlas`
  for the globe, plus internal API routes (`/api/tle`, `/api/track`, `/api/iss`,
  `/api/pass`, `/api/geocode`)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To build for production:

```bash
npm run build
npm start
```
