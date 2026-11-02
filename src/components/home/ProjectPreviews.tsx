"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Lightweight (SVG + CSS) homepage previews. Each takes `on` (card scrolled into view)
 * and plays once; with reduced motion they render their final frame immediately.
 */

type PreviewProps = { on: boolean };

const trans = (on: boolean, reduced: boolean, delay = 0, dur = 0.8) =>
  reduced ? "none" : `transform ${dur}s cubic-bezier(.3,.7,.2,1) ${on ? delay : 0}s, opacity ${dur}s ease ${on ? delay : 0}s, stroke-dashoffset 1s ease ${on ? delay : 0}s`;

/** ComfyDriver: a case file whose sheets slide out and a red string connects the notes. */
function CaseFilePreview({ on }: PreviewProps) {
  const reduced = useReducedMotion();
  const open = on || reduced;
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width="320" height="200" fill="#1a1612" />
      {/* sheets */}
      <g style={{ transform: open ? "translateY(-34px) rotate(-3deg)" : "translateY(0)", transformOrigin: "160px 120px", transition: trans(open, reduced, 0.2) }}>
        <rect x="70" y="62" width="150" height="104" rx="3" fill="#e8dfc8" />
        <rect x="84" y="78" width="70" height="5" fill="#2b2622" opacity=".7" />
        <rect x="84" y="92" width="110" height="4" fill="#2b2622" opacity=".4" />
        <rect x="84" y="104" width="96" height="4" fill="#8a2b2b" opacity=".8" />
      </g>
      <g style={{ transform: open ? "translate(26px,-22px) rotate(4deg)" : "translate(0,0)", transformOrigin: "160px 120px", transition: trans(open, reduced, 0.4) }}>
        <rect x="100" y="70" width="150" height="100" rx="3" fill="#d9cfb4" />
        <text x="114" y="96" fontFamily="monospace" fontSize="9" fill="#2b2622">"scenic, but not slow"</text>
        <rect x="114" y="108" width="100" height="4" fill="#2b2622" opacity=".35" />
      </g>
      {/* folder */}
      <path d="M52 92 h60 l10 -12 h146 v100 h-216z" fill="#b99b63" />
      <path d="M52 100 h216 v78 h-216z" fill="#c9ab72" />
      <text x="66" y="150" fontFamily="monospace" fontSize="10" fill="#3a2d1a">CASE FILE: COMFYDRIVER</text>
      {/* red string */}
      <path d="M96 84 C 150 40, 200 40, 236 70" fill="none" stroke="#8a2b2b" strokeWidth="2" pathLength={100} strokeDasharray="100" strokeDashoffset={open ? 0 : 100} style={{ transition: reduced ? "none" : "stroke-dashoffset 1s ease 0.9s" }} />
    </svg>
  );
}

/** Duckiebot: a small robot drives along a lane and corrects into the bend. */
function DuckiePreview({ on }: PreviewProps) {
  const reduced = useReducedMotion();
  const path = "M20 150 C 110 150, 150 150, 190 120 S 270 60, 305 62";
  const animate = on && !reduced;
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width="320" height="200" fill="#12151a" />
      <path d="M20 150 C 110 150, 150 150, 190 120 S 270 60, 305 62" fill="none" stroke="#252b33" strokeWidth="56" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#f5c400" strokeWidth="2" strokeDasharray="10 9" opacity=".8" />
      <path d="M20 122 C 110 122, 140 126, 172 98 S 262 36, 305 34" fill="none" stroke="#e8edf2" strokeWidth="1.5" opacity=".7" />
      <path d="M20 178 C 110 178, 160 178, 208 142 S 280 86, 305 90" fill="none" stroke="#e8edf2" strokeWidth="1.5" opacity=".7" />
      <g transform={animate ? undefined : "translate(150 138) rotate(-20)"}>
        <rect x="-11" y="-8" width="22" height="16" rx="3" fill="#f5c400" />
        <rect x="6" y="-4" width="6" height="8" rx="1" fill="#12151a" />
        <circle cx="-6" cy="-9" r="2.2" fill="#0b0d10" />
        <circle cx="-6" cy="9" r="2.2" fill="#0b0d10" />
        {animate && <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={path} />}
      </g>
    </svg>
  );
}

/** Linxicon: word nodes appear, then bonds draw between them. */
const NODES: { x: number; y: number; w: string }[] = [
  { x: 160, y: 100, w: "word" },
  { x: 90, y: 60, w: "speech" },
  { x: 230, y: 56, w: "meaning" },
  { x: 70, y: 140, w: "root" },
  { x: 240, y: 146, w: "syntax" },
  { x: 160, y: 170, w: "form" },
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 3], [2, 4]];

function WordNetPreview({ on }: PreviewProps) {
  const reduced = useReducedMotion();
  const open = on || reduced;
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width="320" height="200" fill="#0a0d24" />
      {EDGES.map(([a, b], i) => (
        <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="#8b7bff" strokeWidth="1.2" pathLength={100} strokeDasharray="100" strokeDashoffset={open ? 0 : 100} style={{ transition: reduced ? "none" : `stroke-dashoffset .9s ease ${0.5 + i * 0.12}s` }} />
      ))}
      {NODES.map((n, i) => (
        <g key={n.w} style={{ opacity: open ? 1 : 0, transition: reduced ? "none" : `opacity .5s ease ${i * 0.1}s` }}>
          <circle cx={n.x} cy={n.y} r={i === 0 ? 7 : 4.5} fill={i === 0 ? "#e6c35c" : "#7be3f2"} />
          <text x={n.x} y={n.y - 11} textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#e8ecff">{n.w}</text>
        </g>
      ))}
    </svg>
  );
}

/** Court Part: stacked parts separate into an exploded view with guide lines. */
function ExplodedPreview({ on }: PreviewProps) {
  const reduced = useReducedMotion();
  const open = on || reduced;
  const parts = [
    { y: 0, w: 120, c: "#8c97a3" },
    { y: 1, w: 90, c: "#ff7a1a" },
    { y: 2, w: 120, c: "#8c97a3" },
    { y: 3, w: 70, c: "#6f7c89" },
  ];
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <rect width="320" height="200" fill="#0a1930" />
      <g stroke="#1d3a63" strokeWidth=".6">
        {Array.from({ length: 16 }).map((_, i) => <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="200" />)}
        {Array.from({ length: 10 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 20} x2="320" y2={i * 20} />)}
      </g>
      <line x1="160" y1="20" x2="160" y2="180" stroke="#39c4d8" strokeWidth="1" strokeDasharray="4 4" style={{ opacity: open ? 0.8 : 0, transition: "opacity .6s ease .6s" }} />
      {parts.map((p, i) => {
        const base = 120 - i * 14;
        const exploded = 150 - i * 40;
        return (
          <rect key={i} x={160 - p.w / 2} y={base - 10} width={p.w} height="18" rx="3" fill={p.c} stroke="#cfe9f7" strokeWidth="1" opacity=".95"
            style={{ transform: `translateY(${open ? exploded - base : 0}px)`, transition: reduced ? "none" : `transform .9s cubic-bezier(.3,.7,.2,1) ${0.15 * i}s` }} />
        );
      })}
    </svg>
  );
}

export default function ProjectPreview({ slug, on }: { slug: string; on: boolean }) {
  switch (slug) {
    case "comfydriver": return <CaseFilePreview on={on} />;
    case "duckiebot": return <DuckiePreview on={on} />;
    case "linxicon": return <WordNetPreview on={on} />;
    case "court-part-maintenance": return <ExplodedPreview on={on} />;
    default: return null;
  }
}
