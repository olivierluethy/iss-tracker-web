import { feature } from "topojson-client";
import landData from "world-atlas/land-110m.json";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

type LandFeature = Feature<Polygon | MultiPolygon>;

let cached: FeatureCollection<Polygon | MultiPolygon> | null = null;

export function getLand(): FeatureCollection<Polygon | MultiPolygon> {
  if (cached) return cached;
  const topo = landData as unknown as Parameters<typeof feature>[0];
  const obj = (landData as { objects: Record<string, unknown> }).objects.land;
  const fc = feature(
    topo,
    obj as Parameters<typeof feature>[1]
  ) as unknown as FeatureCollection<Polygon | MultiPolygon> | LandFeature;

  if ("type" in fc && fc.type === "FeatureCollection") {
    cached = fc;
  } else {
    cached = { type: "FeatureCollection", features: [fc as LandFeature] };
  }
  return cached;
}
