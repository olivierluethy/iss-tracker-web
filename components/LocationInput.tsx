"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, MapPinned, X, Locate } from "lucide-react";
import type { GeoLocation } from "@/lib/types";

type Props = {
  observer: GeoLocation | null;
  onSet: (loc: GeoLocation | null) => void;
};

export default function LocationInput({ observer, onSet }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [usingGeo, setUsingGeo] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // No query — clear results on the next tick so we stay outside the effect body.
      const id = window.setTimeout(() => setResults([]), 0);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (cancelled) return;
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const useBrowserLocation = () => {
    if (!navigator.geolocation) return;
    setUsingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSet({
          name: "Your location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setUsingGeo(false);
      },
      () => {
        setUsingGeo(false);
      },
      { timeout: 8000 }
    );
  };

  if (observer) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-4 py-2.5 backdrop-blur-md"
      >
        <div className="flex min-w-0 items-center gap-2">
          <MapPinned className="h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-amber-100">{observer.name}</div>
            <div className="truncate font-mono text-[10px] text-amber-200/60">
              {observer.latitude.toFixed(2)}°, {observer.longitude.toFixed(2)}°
            </div>
          </div>
        </div>
        <button
          onClick={() => onSet(null)}
          className="rounded-md p-1 text-amber-200/70 transition hover:bg-white/5 hover:text-amber-100"
          aria-label="Clear location"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="pointer-events-auto relative">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 backdrop-blur-md focus-within:border-cyan-400/40">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Find a city…"
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <button
          onClick={useBrowserLocation}
          disabled={usingGeo}
          className="rounded-md p-1 text-slate-400 transition hover:bg-white/5 hover:text-cyan-300 disabled:opacity-50"
          aria-label="Use my location"
          title="Use my location"
        >
          {usingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/85 shadow-xl backdrop-blur-xl"
          >
            {results.map((r, i) => (
              <li key={`${r.name}-${i}`}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSet(r);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition hover:bg-white/5"
                >
                  <span className="truncate text-slate-100">
                    {r.name}
                    {r.admin1 && <span className="text-slate-400">, {r.admin1}</span>}
                    {r.country && <span className="text-slate-500"> · {r.country}</span>}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
