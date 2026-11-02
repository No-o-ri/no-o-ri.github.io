"use client";

import { useEffect, useState } from "react";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Headline numbers from the resume, counted up when they scroll into view. */
const STATS = [
  { value: 88.2, decimals: 1, suffix: "%", label: "Test accuracy classifying Alzheimer's from EEG", note: "Published · BMES 2025" },
  { value: 600, decimals: 0, suffix: "+", label: "Hackers from 30+ countries at HackSocial 2026", note: "Co-founder" },
  { value: 15, decimals: 0, prefix: "Top ", suffix: "%", label: "picoCTF, high-school division", note: "Top 20% globally" },
  { value: 1, decimals: 0, text: "Live", label: "Software in daily use at the Kings County DA's Office", note: "Angular · .NET" },
] as const;

function Counter({ to, decimals, run }: { to: number; decimals: number; run: boolean }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced) { setV(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1400);
      setV(to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, reduced]);
  return <>{v.toFixed(decimals)}</>;
}

export default function ImpactStrip() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>(0.4);
  return (
    <section id="highlights" aria-label="Highlights" className="container-x scroll-mt-24">
      <div ref={ref} className="grid overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 1 }}>
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className="relative bg-bg p-6 md:p-7"
            style={{ opacity: seen ? 1 : 0, transform: seen ? "none" : "translateY(10px)", transition: `opacity .7s ease ${i * 0.12}s, transform .7s ease ${i * 0.12}s` }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">{s.note}</p>
            <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
              {"text" in s ? (
                <span className="inline-flex items-center gap-3">
                  <span aria-hidden className="h-3 w-3 animate-pulse rounded-full bg-[#7ee0a8] shadow-[0_0_12px_#7ee0a8]" />
                  {s.text}
                </span>
              ) : (
                <>
                  {"prefix" in s && <span className="text-2xl text-muted md:text-3xl">{s.prefix}</span>}
                  <Counter to={s.value} decimals={s.decimals} run={seen} />
                  <span className="text-accent">{s.suffix}</span>
                </>
              )}
            </p>
            <p className="mt-2 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
