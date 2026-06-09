import { NextResponse } from "next/server";
import { predictGroundTrack } from "@/lib/pass-prediction";

let tleCache: { lines: [string, string]; fetchedAt: number } | null = null;
const TLE_TTL_MS = 30 * 60 * 1000;

async function getTLE(): Promise<[string, string]> {
  if (tleCache && Date.now() - tleCache.fetchedAt < TLE_TTL_MS) {
    return tleCache.lines;
  }
  const res = await fetch(
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle",
    { cache: "no-store", headers: { "User-Agent": "iss-tracker" } }
  );
  if (!res.ok) {
    if (tleCache) return tleCache.lines;
    throw new Error("TLE fetch failed");
  }
  const text = (await res.text()).trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  if (lines.length < 3) {
    if (tleCache) return tleCache.lines;
    throw new Error("Bad TLE format");
  }
  const tle: [string, string] = [lines[1], lines[2]];
  tleCache = { lines: tle, fetchedAt: Date.now() };
  return tle;
}

export async function GET() {
  try {
    const tle = await getTLE();
    const now = new Date();
    const past = predictGroundTrack(tle, new Date(now.getTime() - 30 * 60 * 1000), 30, 60);
    const future = predictGroundTrack(tle, now, 95, 60);
    return NextResponse.json({ past, future });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Track failed" },
      { status: 500 }
    );
  }
}
