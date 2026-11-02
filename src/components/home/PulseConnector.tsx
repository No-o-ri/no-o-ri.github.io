"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/** Vertical circuit line between homepage sections; the pulse is driven by scroll position. */
export default function PulseConnector() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 40%"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-40%", "380%"]);

  return (
    <div ref={ref} aria-hidden className="relative mx-auto h-28 w-px overflow-hidden bg-line">
      {reduced ? (
        <div className="h-full w-px bg-accent/40" />
      ) : (
        <motion.div
          style={{ y }}
          className="h-7 w-px bg-gradient-to-b from-transparent via-accent to-transparent shadow-[0_0_8px_#42d9d1]"
        />
      )}
    </div>
  );
}
