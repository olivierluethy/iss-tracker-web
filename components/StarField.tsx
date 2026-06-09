"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; baseAlpha: number; phase: number; speed: number };

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const seed = (count: number, w: number, h: number) => {
      const arr: Star[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.2,
          baseAlpha: Math.random() * 0.6 + 0.2,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.0008 + 0.0002,
        });
      }
      return arr;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      const count = Math.round((rect.width * rect.height) / 4500);
      starsRef.current = seed(Math.min(count, 600), rect.width, rect.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (ts: number) => {
      const { w, h, dpr } = sizeRef.current;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      for (const s of starsRef.current) {
        const a = s.baseAlpha * (0.55 + 0.45 * Math.sin(s.phase + ts * s.speed));
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
