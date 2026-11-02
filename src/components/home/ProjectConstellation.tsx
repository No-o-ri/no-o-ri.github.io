"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/content/projects";

// Node positions as % of a square stage; the same numbers drive the SVG traces.
const SPOTS: [number, number][] = [
  [22, 18],
  [80, 30],
  [20, 76],
  [78, 84],
];

const CORE = 50;

function trace([x, y]: [number, number]) {
  const mx = CORE + (x - CORE) * 0.5;
  const my = CORE + (y - CORE) * 0.5;
  return `M${CORE} ${CORE} L${mx} ${my} H${x} V${y}`;
}

/**
 * Post-intro interactive layer. A 2D circuit (rings, traces, travelling pulses) is stacked in CSS 3D
 * so it parallaxes with the cursor; each project is a node that lights its trace on hover/focus,
 * and the core chip fires a pulse down every trace when clicked.
 */
export default function ProjectConstellation({ reduced }: { reduced: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const el = stageRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--ry", `${(nx * 16).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${(-ny * 12).toFixed(2)}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  return (
    <div className="relative mx-auto w-full max-w-[34rem] [perspective:1100px]">
      <div
        ref={stageRef}
        className="relative aspect-square w-full [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transition:transform_.25s_ease-out]"
      >
        {/* Layer 0: traces + rings (2D, pushed back) */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full overflow-visible [transform:translateZ(-30px)]"
          fill="none"
        >
          <defs>
            <radialGradient id="cc-core-glow">
              <stop offset="0%" stopColor="#42d9d1" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#42d9d1" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={CORE} cy={CORE} r="46" fill="url(#cc-core-glow)" />
          <circle cx={CORE} cy={CORE} r="40" stroke="#26313d" strokeWidth="0.3" strokeDasharray="0.8 1.6" className="cc-spin" />
          <circle cx={CORE} cy={CORE} r="27" stroke="#42d9d1" strokeOpacity="0.35" strokeWidth="0.35" strokeDasharray="6 3 1 3" className="cc-spin-rev" />
          {SPOTS.map((s, i) => {
            const d = trace(s);
            const on = active === i;
            return (
              <g key={i}>
                <path d={d} stroke={on ? "#42d9d1" : "#26313d"} strokeOpacity={on ? 0.6 : 1} strokeWidth="0.7" strokeLinejoin="round" style={{ transition: "stroke .3s" }} />
                <path
                  d={d}
                  stroke={on ? "#c9fffb" : "#42d9d1"}
                  strokeWidth={on ? 1.1 : 0.8}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="10 100"
                  className="cc-pulse"
                  style={{ animationDuration: on ? "1.1s" : "3.6s", animationDelay: `${i * 0.7}s`, filter: "drop-shadow(0 0 1.2px #42d9d1)" }}
                />
                {burst > 0 && (
                  <path
                    key={burst}
                    d={d}
                    stroke="#fff"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="16 100"
                    className="cc-burst"
                    style={{ animationDelay: `${i * 0.08}s`, filter: "drop-shadow(0 0 2px #42d9d1)" }}
                  />
                )}
                <circle cx={s[0]} cy={s[1]} r="1.6" fill="#080b10" stroke="#42d9d1" strokeWidth="0.5" />
              </g>
            );
          })}
        </svg>

        {/* Layer 1: core chip (closest) */}
        <button
          type="button"
          onClick={() => setBurst((b) => b + 1)}
          aria-label="Send a pulse through the circuit"
          className="group absolute left-1/2 top-1/2 grid h-[22%] w-[22%] place-items-center rounded-2xl border border-accent/60 bg-surface/90 shadow-[0_0_50px_-8px_rgba(66,217,209,.55)] backdrop-blur [transform:translate(-50%,-50%)_translateZ(70px)] transition-[box-shadow,border-color] hover:border-accent hover:shadow-[0_0_70px_-4px_rgba(66,217,209,.8)]"
        >
          <span aria-hidden className="absolute inset-[10%] rounded-xl border border-accent/25" />
          <span aria-hidden className="font-mono text-[clamp(1rem,2.4vw,1.6rem)] font-bold tracking-tight text-accent">SN</span>
          <span aria-hidden className="absolute -bottom-7 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-muted opacity-0 transition-opacity group-hover:opacity-100">
            click to pulse
          </span>
        </button>

        {/* Layer 2: project nodes */}
        {projects.map((p, i) => {
          const [x, y] = SPOTS[i] ?? SPOTS[0];
          const on = active === i;
          return (
            <Link
              key={p.slug}
              href={`/projects/${p.slug}`}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${p.title}: ${p.highlight}`}
              className={`absolute w-[34%] rounded-xl border bg-surface/85 p-3 backdrop-blur transition-[border-color,box-shadow,transform] duration-300 ${
                on ? "z-10 border-accent shadow-[0_0_40px_-6px_rgba(66,217,209,.55)]" : "border-line"
              }`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%,-50%) translateZ(${on ? 110 : 45}px)`,
              }}
            >
              <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                <span><span className="text-accent">0{i + 1}</span> · {p.category.split(" · ")[0]}</span>
                <ArrowUpRight size={12} aria-hidden className={`transition-all ${on ? "text-accent" : "opacity-0"}`} />
              </span>
              <span className="mt-1 block text-[clamp(.78rem,1.5vw,.95rem)] font-semibold leading-tight">{p.title.split(" Autonomous")[0]}</span>
              <span
                className="grid text-xs leading-snug text-muted transition-all duration-300"
                style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}
              >
                <span className="overflow-hidden"><span className="mt-1.5 block">{p.highlight}</span></span>
              </span>
            </Link>
          );
        })}
      </div>

      <style>{`
        @keyframes cc-pulse { from { stroke-dashoffset: 10 } to { stroke-dashoffset: -100 } }
        @keyframes cc-burst { from { stroke-dashoffset: 16; opacity: 1 } to { stroke-dashoffset: -100; opacity: 1 } }
        @keyframes cc-spin { to { transform: rotate(360deg) } }
        .cc-pulse { animation: cc-pulse 3.6s cubic-bezier(.45,0,.25,1) infinite }
        .cc-burst { animation: cc-burst .9s cubic-bezier(.45,0,.25,1) both }
        .cc-spin, .cc-spin-rev { transform-origin: 50% 50%; transform-box: view-box }
        .cc-spin { animation: cc-spin 60s linear infinite }
        .cc-spin-rev { animation: cc-spin 38s linear infinite reverse }
        @media (prefers-reduced-motion: reduce) { .cc-pulse, .cc-spin, .cc-spin-rev { animation: none } }
      `}</style>
    </div>
  );
}
