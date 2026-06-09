"use client";

import { useEffect, useRef } from "react";
import { geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { getLand } from "@/lib/world";
import { subsolarPoint } from "@/lib/sun";

type GroundPoint = { lat: number; lng: number; t: number };

type GlobeProps = {
  iss: { latitude: number; longitude: number } | null;
  pastTrack: GroundPoint[];
  futureTrack: GroundPoint[];
  observer: { latitude: number; longitude: number } | null;
  followISS: boolean;
};

const ROTATION_SPEED = 4;

export default function Globe({
  iss,
  pastTrack,
  futureTrack,
  observer,
  followISS,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef({
    rotationLng: 0,
    rotationLat: -15,
    targetLng: 0,
    targetLat: -15,
    lastTs: 0,
    iss: null as GlobeProps["iss"],
    pastTrack: [] as GroundPoint[],
    futureTrack: [] as GroundPoint[],
    observer: null as GlobeProps["observer"],
    followISS: false,
    landRendered: false,
    landPath: null as Path2D | null,
    graticulePath: null as Path2D | null,
    width: 0,
    height: 0,
    dpr: 1,
  });

  // Keep a ref of the latest props for the animation loop to read.
  useEffect(() => {
    const s = stateRef.current;
    s.iss = iss;
    s.pastTrack = pastTrack;
    s.futureTrack = futureTrack;
    s.observer = observer;
    s.followISS = followISS;
  }, [iss, pastTrack, futureTrack, observer, followISS]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const land = getLand();
    const graticule = makeGraticule();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const s = stateRef.current;
      s.width = rect.width;
      s.height = rect.height;
      s.dpr = dpr;
      s.landRendered = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (ts: number) => {
      const s = stateRef.current;
      const dt = s.lastTs ? Math.min(ts - s.lastTs, 64) : 16;
      s.lastTs = ts;

      // Auto-rotate when not following ISS.
      if (!s.followISS && !s.iss) {
        s.targetLng = s.rotationLng - (ROTATION_SPEED * dt) / 1000;
      } else if (s.followISS && s.iss) {
        s.targetLng = -s.iss.longitude;
        s.targetLat = -s.iss.latitude * 0.5 - 10;
      }
      // Smooth interpolation toward target.
      const ease = 1 - Math.exp(-dt / 350);
      s.rotationLng += (s.targetLng - s.rotationLng) * ease;
      s.rotationLat += (s.targetLat - s.rotationLat) * ease;
      // Keep longitude wrapped.
      if (s.rotationLng > 360) s.rotationLng -= 360;
      if (s.rotationLng < -360) s.rotationLng += 360;

      render(ctx, s, land, graticule);
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ touchAction: "none" }}
      aria-label="Earth globe with ISS position"
    />
  );
}

function makeGraticule() {
  const lines: Array<Array<[number, number]>> = [];
  for (let lat = -80; lat <= 80; lat += 20) {
    const ring: Array<[number, number]> = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      ring.push([lng, lat]);
    }
    lines.push(ring);
  }
  for (let lng = -180; lng < 180; lng += 30) {
    const ring: Array<[number, number]> = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      ring.push([lng, lat]);
    }
    lines.push(ring);
  }
  return lines;
}

type RenderState = {
  rotationLng: number;
  rotationLat: number;
  iss: GlobeProps["iss"];
  pastTrack: GroundPoint[];
  futureTrack: GroundPoint[];
  observer: GlobeProps["observer"];
  width: number;
  height: number;
  dpr: number;
};

function render(
  ctx: CanvasRenderingContext2D,
  s: RenderState,
  land: ReturnType<typeof getLand>,
  graticule: Array<Array<[number, number]>>
) {
  const { width: W, height: H, dpr, rotationLng, rotationLat } = s;
  if (!W || !H) return;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * 0.42;

  const projection = geoOrthographic()
    .scale(radius)
    .translate([cx, cy])
    .rotate([rotationLng, rotationLat])
    .clipAngle(90);

  const path = geoPath(projection, ctx);

  // 1. Atmospheric outer glow.
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.4);
  glow.addColorStop(0, "rgba(96, 165, 250, 0.35)");
  glow.addColorStop(0.5, "rgba(59, 130, 246, 0.12)");
  glow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // 2. Ocean / sphere base — radial gradient gives subtle 3D shading.
  const sphere = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.1,
    cx,
    cy,
    radius
  );
  sphere.addColorStop(0, "#1e3a8a");
  sphere.addColorStop(0.6, "#0c1e3f");
  sphere.addColorStop(1, "#050a18");
  ctx.fillStyle = sphere;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Graticule (subtle latitude/longitude grid).
  ctx.strokeStyle = "rgba(148, 184, 245, 0.08)";
  ctx.lineWidth = 0.6;
  for (const line of graticule) {
    ctx.beginPath();
    path({
      type: "Feature",
      geometry: { type: "LineString", coordinates: line },
      properties: {},
    } as GeoPermissibleObjects);
    ctx.stroke();
  }

  // 4. Land masses.
  ctx.fillStyle = "rgba(74, 153, 113, 0.85)";
  ctx.strokeStyle = "rgba(180, 235, 210, 0.35)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  path(land as GeoPermissibleObjects);
  ctx.fill();
  ctx.stroke();

  // 5. Day/night terminator — overlay night hemisphere with a darkening mask.
  drawNightShade(ctx, projection, cx, cy, radius);

  // 6. Past ground track (faded).
  drawTrack(ctx, projection, s.pastTrack, "rgba(125, 211, 252, 0.35)", 1.2, true);

  // 7. Future ground track (bright).
  drawTrack(ctx, projection, s.futureTrack, "rgba(125, 211, 252, 0.95)", 1.5, false);

  // 8. Observer marker.
  if (s.observer) {
    const projected = projection([s.observer.longitude, s.observer.latitude]);
    if (projected && isVisible(projection, s.observer.longitude, s.observer.latitude)) {
      const [x, y] = projected;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  }

  // 9. ISS marker.
  if (s.iss) {
    const projected = projection([s.iss.longitude, s.iss.latitude]);
    if (projected && isVisible(projection, s.iss.longitude, s.iss.latitude)) {
      const [x, y] = projected;
      // Outer glow halo.
      const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, 22);
      haloGrad.addColorStop(0, "rgba(244, 114, 182, 0.55)");
      haloGrad.addColorStop(1, "rgba(244, 114, 182, 0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Inner pulse ring.
      const pulse = (Math.sin(performance.now() / 600) + 1) / 2;
      ctx.beginPath();
      ctx.arc(x, y, 8 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(244, 114, 182, ${0.5 - pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Core dot.
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#f472b6";
      ctx.fill();
      ctx.strokeStyle = "#fdf2f8";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 10. Crisp sphere edge / inner atmosphere rim.
  const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius);
  rimGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
  rimGrad.addColorStop(1, "rgba(186, 230, 253, 0.35)");
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  projection: ReturnType<typeof geoOrthographic>,
  pts: GroundPoint[],
  color: string,
  width: number,
  fade: boolean
) {
  if (pts.length < 2) return;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Break into segments where the projection clips (back-of-globe).
  let segStart = 0;
  for (let i = 0; i < pts.length; i++) {
    const visible = isVisible(projection, pts[i].lng, pts[i].lat);
    const isLast = i === pts.length - 1;
    if (!visible || isLast) {
      const end = visible && isLast ? i + 1 : i;
      if (end - segStart >= 2) {
        ctx.beginPath();
        for (let j = segStart; j < end; j++) {
          const p = projection([pts[j].lng, pts[j].lat]);
          if (!p) continue;
          if (j === segStart) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        }
        if (fade) {
          // Apply a gradient along the path: faded at start, brighter at end.
          ctx.strokeStyle = color;
        } else {
          ctx.strokeStyle = color;
        }
        ctx.stroke();
      }
      segStart = i + 1;
    }
  }
}

function isVisible(
  projection: ReturnType<typeof geoOrthographic>,
  lng: number,
  lat: number
): boolean {
  // Orthographic projection returns null for clipped points when clipAngle(90) is set
  const result = projection([lng, lat]);
  return result !== null && result !== undefined;
}

function drawNightShade(
  ctx: CanvasRenderingContext2D,
  projection: ReturnType<typeof geoOrthographic>,
  cx: number,
  cy: number,
  radius: number
) {
  const sun = subsolarPoint();
  // Generate a circle of "anti-sun" points (terminator) at 90° from subsolar.
  // The night side is the hemisphere centered at (sun.lng+180, -sun.lat).
  const antiLng = sun.lng + 180;
  const antiLat = -sun.lat;

  ctx.save();
  // Mask drawing to globe disc.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Approximate night shadow by drawing a circle in screen space, centered at the
  // projected anti-solar point with a feathered edge.
  const projected = projection([antiLng, antiLat]);
  if (projected) {
    const [nx, ny] = projected;
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius * 1.15);
    grad.addColorStop(0, "rgba(2, 6, 23, 0.7)");
    grad.addColorStop(0.5, "rgba(2, 6, 23, 0.55)");
    grad.addColorStop(0.85, "rgba(2, 6, 23, 0.15)");
    grad.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // The night side is hidden behind the globe (we're looking at full daylight side)
    // — apply a soft dimming on the side opposite the sub-solar projected point.
    const sunProj = projection([sun.lng, sun.lat]);
    if (sunProj) {
      const [sx, sy] = sunProj;
      const grad = ctx.createRadialGradient(sx, sy, radius * 0.4, sx, sy, radius * 1.6);
      grad.addColorStop(0, "rgba(2, 6, 23, 0)");
      grad.addColorStop(1, "rgba(2, 6, 23, 0.35)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
