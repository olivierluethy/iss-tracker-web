import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  eciToGeodetic,
  ecfToLookAngles,
  degreesToRadians,
} from "satellite.js";
import type { PassEvent } from "./types";

const MIN_ELEVATION_DEG = 10;

export function predictNextPasses(
  tle: [string, string],
  observerLat: number,
  observerLng: number,
  observerAltKm = 0,
  fromDate: Date = new Date(),
  hours = 48,
  maxPasses = 3
): PassEvent[] {
  const satrec = twoline2satrec(tle[0], tle[1]);
  const observer = {
    latitude: degreesToRadians(observerLat),
    longitude: degreesToRadians(observerLng),
    height: observerAltKm,
  };

  const stepSec = 30;
  const total = Math.floor((hours * 3600) / stepSec);
  const passes: PassEvent[] = [];

  let inPass = false;
  let riseTime = 0;
  let riseAz = 0;
  let maxEl = 0;
  let lastT = 0;
  let lastAz = 0;

  for (let i = 0; i <= total && passes.length < maxPasses; i++) {
    const t = fromDate.getTime() + i * stepSec * 1000;
    const date = new Date(t);
    const result = propagate(satrec, date);
    if (typeof result.position === "boolean" || !result.position) continue;
    const gmst = gstime(date);
    const ecf = eciToEcf(result.position, gmst);
    const look = ecfToLookAngles(observer, ecf);
    const elDeg = (look.elevation * 180) / Math.PI;
    const azDeg = (look.azimuth * 180) / Math.PI;

    if (!inPass && elDeg >= MIN_ELEVATION_DEG) {
      inPass = true;
      riseTime = t;
      riseAz = azDeg;
      maxEl = elDeg;
    } else if (inPass) {
      if (elDeg > maxEl) maxEl = elDeg;
      if (elDeg < MIN_ELEVATION_DEG) {
        passes.push({
          riseTime,
          setTime: t,
          durationSeconds: Math.round((t - riseTime) / 1000),
          maxElevation: Math.round(maxEl * 10) / 10,
          riseAzimuth: Math.round(riseAz),
          setAzimuth: Math.round(azDeg),
        });
        inPass = false;
        maxEl = 0;
      }
    }

    lastT = t;
    lastAz = azDeg;
  }

  if (inPass) {
    passes.push({
      riseTime,
      setTime: lastT,
      durationSeconds: Math.round((lastT - riseTime) / 1000),
      maxElevation: Math.round(maxEl * 10) / 10,
      riseAzimuth: Math.round(riseAz),
      setAzimuth: Math.round(lastAz),
    });
  }

  return passes;
}

export function predictGroundTrack(
  tle: [string, string],
  fromDate: Date = new Date(),
  minutes = 95,
  stepSec = 30
): { lat: number; lng: number; t: number }[] {
  const satrec = twoline2satrec(tle[0], tle[1]);
  const totalSteps = Math.floor((minutes * 60) / stepSec);
  const out: { lat: number; lng: number; t: number }[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const t = fromDate.getTime() + i * stepSec * 1000;
    const date = new Date(t);
    const result = propagate(satrec, date);
    if (typeof result.position === "boolean" || !result.position) continue;
    const gmst = gstime(date);
    const geo = eciToGeodetic(result.position, gmst);
    out.push({
      lat: (geo.latitude * 180) / Math.PI,
      lng: (geo.longitude * 180) / Math.PI,
      t,
    });
  }
  return out;
}
