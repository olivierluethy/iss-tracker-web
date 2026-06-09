"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const FACTS = [
  "The ISS completes one full orbit every ~90 minutes — that's 16 sunrises a day.",
  "At ~28,000 km/h, the ISS is the fastest crewed vehicle in regular operation.",
  "It orbits at roughly 408 km — close enough that you can see it with the naked eye.",
  "The ISS has been continuously occupied since November 2nd, 2000.",
  "Its solar arrays span 73 m wide — about the wingspan of a 747.",
  "Inside, astronauts experience microgravity — they don't feel weight, but gravity is still ~90% of Earth's.",
  "Every year the ISS travels far enough to make eight round-trips to the Moon.",
  "Its orbital inclination of 51.6° means it overflies most populated regions of Earth.",
];

export default function EduFact() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FACTS.length);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-md"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
          className="text-xs leading-relaxed text-slate-300"
        >
          {FACTS[index]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}
