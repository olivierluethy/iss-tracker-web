"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Mountain, MapPin, Sun, Moon, Activity } from "lucide-react";
import type { ISSPosition } from "@/lib/types";

type Props = {
  iss: ISSPosition | null;
  loading: boolean;
};

function formatLat(v: number) {
  const dir = v >= 0 ? "N" : "S";
  return `${Math.abs(v).toFixed(4)}° ${dir}`;
}

function formatLng(v: number) {
  const dir = v >= 0 ? "E" : "W";
  return `${Math.abs(v).toFixed(4)}° ${dir}`;
}

export default function DataPanel({ iss, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/55 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="relative h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
          <span className="absolute inset-0 rounded-full bg-emerald-400" />
        </div>
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
          Live telemetry
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Field
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Latitude"
          value={iss ? formatLat(iss.latitude) : "—"}
          loading={loading}
        />
        <Field
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Longitude"
          value={iss ? formatLng(iss.longitude) : "—"}
          loading={loading}
        />
        <Field
          icon={<Mountain className="h-3.5 w-3.5" />}
          label="Altitude"
          value={iss ? `${iss.altitude.toFixed(1)} km` : "—"}
          loading={loading}
        />
        <Field
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Velocity"
          value={iss ? `${Math.round(iss.velocity).toLocaleString()} km/h` : "—"}
          loading={loading}
        />
        <Field
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Footprint"
          value={iss ? `${Math.round(iss.footprint).toLocaleString()} km` : "—"}
          loading={loading}
        />
        <Field
          icon={
            iss?.visibility === "daylight" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )
          }
          label="Sunlight"
          value={iss ? (iss.visibility === "daylight" ? "Daylight" : "Eclipsed") : "—"}
          loading={loading}
        />
      </div>
    </motion.div>
  );
}

function Field({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      <div className="font-mono text-sm tabular-nums text-slate-100">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            {loading && value === "—" ? (
              <span className="text-slate-500">Acquiring…</span>
            ) : (
              value
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
