import { NextRequest, NextResponse } from "next/server";
import { predictNextPasses, predictGroundTrack } from "@/lib/pass-prediction";

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

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(request.nextUrl.searchParams.get("lng") ?? "");
  const wantTrack = request.nextUrl.searchParams.get("track") === "1";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Out of range" }, { status: 400 });
  }

  try {
    const tle = await getTLE();
    const passes = predictNextPasses(tle, lat, lng, 0, new Date(), 48, 3);
    const track = wantTrack ? predictGroundTrack(tle, new Date(), 95, 30) : undefined;
    return NextResponse.json({ passes, track });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prediction failed" },
      { status: 500 }
    );
  }
}
