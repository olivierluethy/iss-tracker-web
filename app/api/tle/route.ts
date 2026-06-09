import { NextResponse } from "next/server";

let cache: { lines: [string, string]; fetchedAt: number } | null = null;
const TLE_TTL_MS = 30 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.fetchedAt < TLE_TTL_MS) {
      return NextResponse.json({ tle: cache.lines, cached: true });
    }
    const res = await fetch(
      "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle",
      { cache: "no-store", headers: { "User-Agent": "iss-tracker" } }
    );
    if (!res.ok) {
      if (cache) return NextResponse.json({ tle: cache.lines, cached: true });
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
    const text = (await res.text()).trim();
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    if (lines.length < 3) {
      return NextResponse.json({ error: "Bad TLE" }, { status: 502 });
    }
    const tle: [string, string] = [lines[1], lines[2]];
    cache = { lines: tle, fetchedAt: Date.now() };
    return NextResponse.json({ tle, cached: false });
  } catch {
    if (cache) return NextResponse.json({ tle: cache.lines, cached: true });
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
