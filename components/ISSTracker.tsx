"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Orbit, Crosshair } from "lucide-react";
import Globe from "./Globe";
import StarField from "./StarField";
import DataPanel from "./DataPanel";
import LocationInput from "./LocationInput";
import NextPassPanel from "./NextPassPanel";
import EduFact from "./EduFact";
import type { GeoLocation, ISSPosition } from "@/lib/types";

type GroundPoint = { lat: number; lng: number; t: number };

const POLL_MS = 4000;
const TRACK_REFRESH_MS = 5 * 60 * 1000;

export default function ISSTracker() {
  const [iss, setIss] = useState<ISSPosition | null>(null);
  const [observer, setObserver] = useState<GeoLocation | null>(null);
  const [pastTrack, setPastTrack] = useState<GroundPoint[]>([]);
  const [futureTrack, setFutureTrack] = useState<GroundPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [followISS, setFollowISS] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleRef = useRef(true);

  // Poll current ISS position.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!visibleRef.current) return;
      try {
        const res = await fetch("/api/iss", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setIss(data);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Connection lost");
          setLoading(false);
        }
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Pause polling when tab is hidden.
  useEffect(() => {
    const onVis = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Fetch ground track (past + future) periodically.
  useEffect(() => {
    let cancelled = false;
    const fetchTrack = async () => {
      try {
        const res = await fetch("/api/track", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setPastTrack(data.past ?? []);
        setFutureTrack(data.future ?? []);
      } catch {
        /* swallow */
      }
    };
    fetchTrack();
    const id = setInterval(fetchTrack, TRACK_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#02040a] text-slate-100">
      {/* Cosmic background gradient. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.06),transparent_60%)]" />
      <StarField />

      {/* Globe canvas fills the viewport. */}
      <div className="absolute inset-0">
        <Globe
          iss={iss ? { latitude: iss.latitude, longitude: iss.longitude } : null}
          pastTrack={pastTrack}
          futureTrack={futureTrack}
          observer={
            observer
              ? { latitude: observer.latitude, longitude: observer.longitude }
              : null
          }
          followISS={followISS}
        />
      </div>

      {/* Vignette. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(2,4,10,0.7)_100%)]" />

      {/* UI overlay grid. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <Header error={error} />

        {/* Mobile-first: stack panels; desktop: split left/right columns. */}
        <div className="flex flex-1 flex-col justify-between gap-4 px-4 pb-4 md:flex-row md:px-8 md:pb-8">
          {/* Left column. */}
          <div className="flex flex-col gap-3 md:w-[340px]">
            <DataPanel iss={iss} loading={loading} />
            <FollowToggle followISS={followISS} onToggle={() => setFollowISS((v) => !v)} />
          </div>

          {/* Spacer keeps the globe area visible behind the overlays. */}
          <div className="hidden flex-1 md:block" />

          {/* Right column. */}
          <div className="flex flex-col gap-3 md:w-[340px]">
            <LocationInput observer={observer} onSet={setObserver} />
            <NextPassPanel observer={observer} />
            <EduFact />
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ error }: { error: string | null }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto flex items-center justify-between px-4 pt-4 md:px-8 md:pt-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
          <Orbit className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            ISS · Live Tracker
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
            International Space Station
          </p>
        </div>
      </div>
      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-rose-200">
          {error}
        </div>
      )}
    </motion.header>
  );
}

function FollowToggle({
  followISS,
  onToggle,
}: {
  followISS: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-xs backdrop-blur-md transition ${
        followISS
          ? "border-cyan-400/40 bg-cyan-400/[0.08] text-cyan-200"
          : "border-white/10 bg-slate-950/55 text-slate-300 hover:border-white/20"
      }`}
    >
      <span className="flex items-center gap-2">
        <Crosshair className="h-3.5 w-3.5" />
        Camera follows ISS
      </span>
      <span
        className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition ${
          followISS ? "bg-cyan-400/70" : "bg-white/10"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`h-3 w-3 rounded-full bg-white shadow ${
            followISS ? "ml-auto" : ""
          }`}
        />
      </span>
    </motion.button>
  );
}
