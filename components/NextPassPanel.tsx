"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ArrowUpRight, Telescope, Loader2, AlertCircle } from "lucide-react";
import type { GeoLocation, PassEvent } from "@/lib/types";

type Props = {
  observer: GeoLocation | null;
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "Now";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function compass(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

export default function NextPassPanel({ observer }: Props) {
  const [passes, setPasses] = useState<PassEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!observer) {
      const id = window.setTimeout(() => {
        setPasses(null);
        setErr(null);
      }, 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setLoading(true);
      setErr(null);
      fetch(`/api/pass?lat=${observer.latitude}&lng=${observer.longitude}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.error) {
            setErr(data.error);
            setPasses([]);
          } else {
            setPasses(data.passes ?? []);
          }
        })
        .catch((e) => !cancelled && setErr(e.message))
        .finally(() => !cancelled && setLoading(false));
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [observer]);

  if (!observer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/55 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center gap-2">
        <Telescope className="h-4 w-4 text-cyan-300" />
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
          Next visible passes
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 py-2 text-xs text-slate-400"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Computing orbit predictions…
          </motion.div>
        )}

        {!loading && err && (
          <motion.div
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 rounded-md bg-rose-950/30 px-2 py-1.5 text-[11px] text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {err}
          </motion.div>
        )}

        {!loading && !err && passes && passes.length === 0 && (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-slate-400"
          >
            No visible passes in the next 48 hours.
          </motion.p>
        )}

        {!loading && !err && passes && passes.length > 0 && (
          <motion.ul
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {passes.map((p, i) => {
              const ms = p.riseTime - now;
              const next = i === 0;
              return (
                <li
                  key={p.riseTime}
                  className={`relative overflow-hidden rounded-lg border px-3 py-2 transition ${
                    next
                      ? "border-cyan-400/30 bg-cyan-400/[0.04]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  {next && (
                    <span className="absolute right-3 top-2 text-[9px] font-medium uppercase tracking-widest text-cyan-300">
                      Up next
                    </span>
                  )}
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.riseTime).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-100">
                      {ms > 0 ? formatCountdown(ms) : "Visible now"}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                    <Stat icon={<Clock className="h-3 w-3" />} label="Duration">
                      {formatDuration(p.durationSeconds)}
                    </Stat>
                    <Stat icon={<ArrowUpRight className="h-3 w-3" />} label="Max el.">
                      {p.maxElevation}°
                    </Stat>
                    <Stat label="Track">
                      {compass(p.riseAzimuth)} → {compass(p.setAzimuth)}
                    </Stat>
                  </div>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-slate-200">{children}</div>
    </div>
  );
}
