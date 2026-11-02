"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FastForward, RotateCcw } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import NoirStreet from "./NoirStreet";

/**
 * ComfyDriver intro: a car pulls up on a rainy street and tosses out a case file (NoirStreet) →
 * case file lands on the desk → paper unfolds → intent extracted → paper becomes a JSON editor.
 * Pure DOM/CSS/SVG (no WebGL), ~7.6s, skippable, replayable. Reduced motion shows the final frame.
 * All JSON values are ILLUSTRATIVE and must be verified against the real implementation.
 */

const REQUEST = {
  pre: "Get me there ",
  p1: "without highway stress",
  mid1: ", ",
  p2: "scenic if you can",
  mid2: ", ",
  p3: "I'm okay adding a few minutes",
  post: ".",
};

const ANNOTATIONS = [
  { phrase: REQUEST.p1, key: "highway", value: "0.25" },
  { phrase: REQUEST.p2, key: "scenic", value: "0.75" },
  { phrase: REQUEST.p3, key: "max_extra_minutes", value: "10" },
];

const CAR_MS = 3300; // street cold open
const STAGE_AT = [0, 1100, 2100, 3500].map((ms) => CAR_MS + ms); // stages 1..4 (stage 0 = street)

export function JsonView({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <pre className="overflow-x-auto font-mono text-[13px] leading-6 sm:text-sm" aria-label="Structured JSON output">
      <code>
        <span className="text-[#8b949e]">{"{"}</span>
        {"\n"}
        {entries.map(([k, v], i) => (
          <span key={k}>
            {"  "}
            <span className="text-[#7ee0d8]">&quot;{k}&quot;</span>
            <span className="text-[#8b949e]">: </span>
            <span className="text-[#e0b252]">{v}</span>
            <span className="text-[#8b949e]">{i < entries.length - 1 ? "," : ""}</span>
            {"\n"}
          </span>
        ))}
        <span className="text-[#8b949e]">{"}"}</span>
      </code>
    </pre>
  );
}

export const INTRO_JSON = { highway: 0.25, scenic: 0.75, traffic: 0.5, toll: 0.25, max_extra_minutes: 10 };

export default function ComfyDriverScene() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0); // 0 street, 1 folder, 2 unfold, 3 extract, 4 JSON
  const [runs, setRuns] = useState(0); // restarts the street animation on replay
  const timers = useRef<number[]>([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const play = useCallback(() => {
    clear();
    setStage(0);
    setRuns((r) => r + 1);
    STAGE_AT.forEach((ms, i) => {
      timers.current.push(window.setTimeout(() => setStage(i + 1), 60 + ms));
    });
  }, []);

  useEffect(() => {
    if (reduced) { clear(); setStage(4); return; }
    play();
    return clear;
  }, [reduced, play]);

  const skip = () => { clear(); setStage(4); };
  const ease = "cubic-bezier(.3,.7,.2,1)";
  const t = (ms: number, extra = "") => (reduced ? "none" : `all ${ms}ms ${ease} ${extra}`);
  const editor = stage >= 4;

  return (
    <div className="relative">
      <div
        role="group"
        aria-label="Animated case file: a driving-preference request becomes structured JSON"
        className="relative h-[560px] overflow-hidden rounded-2xl border border-line sm:h-[480px]"
        style={{ background: "radial-gradient(120% 90% at 30% 10%, #2a2018 0%, #17110c 70%)" }}
      >
        <NoirStreet run={runs > 0} runKey={runs} visible={stage === 0 && !reduced} />

        {/* desk details */}
        <div aria-hidden className="absolute right-6 top-5 hidden rotate-[3deg] bg-[#e8dfc8] px-3 py-2 font-mono text-[10px] text-[#2b2622] shadow-lg sm:block" style={{ opacity: stage >= 1 ? 0.9 : 0, transition: t(600, "0.3s") }}>
          NOTE — verify preference extraction
        </div>
        <svg aria-hidden viewBox="0 0 20 40" className="absolute left-5 top-4 h-10 w-5" style={{ opacity: stage >= 1 ? 1 : 0, transition: t(500, "0.5s") }}>
          <path d="M5 4v26a5 5 0 0 0 10 0V8a3 3 0 0 0-6 0v20" fill="none" stroke="#9aa3ad" strokeWidth="1.6" />
        </svg>

        {/* Folder */}
        <div
          aria-hidden
          className="absolute bottom-5 left-5 w-[58%] max-w-[340px] sm:w-[34%]"
          style={{
            // lands on the desk, continuing the toss from the street
            transform: stage >= 1 ? "translate(0,0) scale(1) rotate(-2deg)" : "translate(30%,-60%) scale(1.6) rotate(-14deg)",
            opacity: stage >= 1 ? 1 : 0,
            transition: t(900),
          }}
        >
          <div className="h-5 w-24 rounded-t-md bg-[#b99b63]" />
          <div className="rounded-b-md rounded-tr-md bg-[#c9ab72] px-4 py-5 shadow-2xl">
            <p className="font-mono text-[11px] font-semibold tracking-wider text-[#3a2d1a]">CASE FILE: COMFYDRIVER</p>
            <p className="mt-1 font-mono text-[10px] text-[#5a4a2e]">STATUS: OPEN</p>
          </div>
        </div>

        {/* Back sheets */}
        {[{ r: -4, x: -14, d: "0.1s" }, { r: 3, x: 12, d: "0.2s" }].map((s, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute right-[4%] top-[6%] h-[78%] w-[68%] rounded-sm bg-[#d9cfb4] shadow-xl sm:w-[56%]"
            style={{
              transform: stage >= 2 ? `translateX(${s.x}px) rotate(${s.r}deg) scaleY(1)` : "translateX(0) rotate(0deg) scaleY(0.05)",
              transformOrigin: "top",
              opacity: editor ? 0 : stage >= 2 ? 1 : 0,
              transition: t(700, s.d),
            }}
          />
        ))}

        {/* Front sheet → editor */}
        <div
          className="absolute right-[4%] top-[6%] h-[78%] w-[68%] overflow-hidden shadow-2xl sm:w-[56%]"
          style={{
            transform: stage >= 2 ? "scaleY(1)" : "scaleY(0.05)",
            transformOrigin: "top",
            opacity: stage >= 2 ? 1 : 0,
            background: editor ? "#0d1117" : "#efe6d2",
            borderRadius: editor ? 12 : 2,
            border: editor ? "1px solid #26313d" : "1px solid transparent",
            transition: t(700) + (reduced ? "" : ", background-color 900ms ease, border-radius 900ms ease"),
          }}
        >
          {/* Paper layer */}
          <div className="absolute inset-0 p-5 text-[#2b2622] sm:p-7" style={{ opacity: editor ? 0 : 1, transition: t(700) }}>
            <div className="flex items-start justify-between gap-4">
              <p className="font-mono text-[11px] font-semibold tracking-widest">DRIVING PREFERENCE REQUEST</p>
              <svg aria-hidden viewBox="0 0 80 50" className="hidden h-12 w-20 shrink-0 sm:block">
                <path d="M2 40 C 20 10, 40 50, 78 8" fill="none" stroke="#8a7a52" strokeWidth="2" />
                <path d="M2 12 L30 24 L52 16 L78 36" fill="none" stroke="#b8aa90" strokeWidth="1.2" strokeDasharray="3 3" />
                <circle cx="30" cy="24" r="2.5" fill="#8a2b2b" />
              </svg>
            </div>

            <p className="mt-4 text-base leading-7 sm:text-lg" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              &ldquo;{REQUEST.pre}
              {[REQUEST.p1, REQUEST.mid1, REQUEST.p2, REQUEST.mid2, REQUEST.p3].map((txt, i) =>
                i % 2 === 0 ? (
                  <mark
                    key={i}
                    className="rounded-[2px] px-0.5 text-inherit"
                    style={{ background: stage >= 3 ? "rgba(170,60,52,.28)" : "transparent", transition: t(600, `${0.15 * (i / 2)}s`) }}
                  >
                    {txt}
                  </mark>
                ) : (
                  <span key={i}>{txt}</span>
                ),
              )}
              {REQUEST.post}&rdquo;
            </p>

            <p className="mt-2 -rotate-1 text-[15px] text-[#8a2b2b]" style={{ fontFamily: "'Segoe Script','Bradley Hand','Brush Script MT',cursive", opacity: stage >= 2 ? 1 : 0, transition: t(600, "0.5s") }}>
              comfort over speed?
            </p>

            <ul className="mt-4 space-y-2">
              {ANNOTATIONS.map((a, i) => (
                <li key={a.key} className="flex items-center gap-2 font-mono text-[11px] sm:text-xs" style={{ opacity: stage >= 3 ? 1 : 0, transition: t(400, `${0.2 + i * 0.25}s`) }}>
                  <span className="shrink-0 text-[#6b5e4a]">{a.key}</span>
                  <span aria-hidden className="h-px flex-1 origin-left bg-[#8a2b2b]" style={{ transform: stage >= 3 ? "scaleX(1)" : "scaleX(0)", transition: t(700, `${0.25 + i * 0.25}s`) }} />
                  <span className="shrink-0 rounded-sm bg-[#8a2b2b] px-1.5 py-0.5 text-[#f3e9d2]">{a.value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Editor layer */}
          <div className="absolute inset-0 p-4 sm:p-6" style={{ opacity: editor ? 1 : 0, transition: t(700, "0.25s") }}>
            <div className="mb-3 flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
              <span className="ml-3 font-mono text-[11px] text-[#8b949e]">preferences.json</span>
            </div>
            <p className="mb-2 font-mono text-[11px] text-[#6e7681]">{"// ambiguous language → machine-readable structure"}</p>
            <JsonView data={INTRO_JSON} />
            <p className="mt-3 font-mono text-[11px] text-[#8b949e]">{"// example output (illustrative values)"}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {stage < 4 && !reduced && (
          <button type="button" onClick={skip} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-muted hover:text-fg">
            <FastForward size={14} aria-hidden /> Skip
          </button>
        )}
        {!reduced && (
          <button type="button" onClick={play} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-muted hover:text-fg">
            <RotateCcw size={14} aria-hidden /> Replay
          </button>
        )}
      </div>
    </div>
  );
}
