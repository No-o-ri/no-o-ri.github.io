"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { asset } from "@/lib/asset";

/**
 * Pixel-art version of the UC San Diego trident: particles cluster into a silhouette, glitch briefly,
 * then crossfade into a clean metallic vector trident. Canvas 2D, ~3s, plays once.
 */

const N = 64;

const LOGO = "/img/trident.png";

/** Rasterises the logo's opaque pixels to an N x N grid so the particles form the exact same shape. */
function buildMask(img: HTMLImageElement): [number, number][] {
  const c = document.createElement("canvas");
  c.width = N; c.height = N;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.drawImage(img, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  const cells: [number, number][] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 128) cells.push([x, y]);
  return cells;
}

export function VectorTrident({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset(LOGO)} alt="" aria-hidden className={`object-contain ${className}`} draggable={false} />
  );
}

type Particle = { sx: number; sy: number; tx: number; ty: number; delay: number; jitter: number };

export default function PixelTrident({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [wrapRef, seen] = useInViewOnce<HTMLDivElement>(0.3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (reduced) { setResolved(true); return; }
    if (!seen) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) { setResolved(true); return; }

    let cancelled = false;
    let raf = 0;
    const img = new Image();
    img.onload = () => { if (!cancelled) run(img); };
    img.onerror = () => setResolved(true);
    img.src = asset(LOGO);
    return () => { cancelled = true; cancelAnimationFrame(raf); };

    function run(img: HTMLImageElement) {
    if (!canvas || !ctx) return;
    const px = 6; // device-independent cell size; canvas is N*px square, scaled by CSS
    canvas.width = N * px;
    canvas.height = N * px;

    // Deterministic scatter so replays look the same.
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const parts: Particle[] = buildMask(img).map(([tx, ty]) => ({
      tx, ty,
      sx: rnd() * N,
      sy: rnd() * N,
      delay: rnd() * 0.7,
      jitter: rnd(),
    }));

    const T_FORM = 1.5, T_GLITCH = 0.55;
    const start = performance.now();
    let fired = false;

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const glitch = t > T_FORM + 0.7 && t < T_FORM + 0.7 + T_GLITCH;

      for (const p of parts) {
        const k = Math.min(1, Math.max(0, (t - p.delay) / T_FORM));
        const e = 1 - Math.pow(1 - k, 3);
        let x = p.sx + (p.tx - p.sx) * e;
        let y = p.sy + (p.ty - p.sy) * e;
        let a = 0.25 + 0.75 * e;
        if (glitch && p.jitter > 0.75) { x += (p.jitter - 0.87) * 6; a = 0.4 + 0.6 * Math.abs(Math.sin(t * 40 + p.jitter * 9)); }
        ctx.fillStyle = k < 1 ? `rgba(66,217,209,${a})` : `rgba(226,200,110,${a})`;
        ctx.fillRect(Math.round(x) * px, Math.round(y) * px, px - 1, px - 1);
      }

      if (t > T_FORM + 0.7 + T_GLITCH && !fired) { fired = true; setResolved(true); }
      if (t < T_FORM + 0.7 + T_GLITCH + 0.8) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(frame);
    }
  }, [seen, reduced]);

  return (
    <div ref={wrapRef} className={`relative aspect-square ${className}`} role="img" aria-label="UC San Diego trident, formed from pixels">
      <VectorTrident className="absolute inset-0 h-full w-full" />
      {/* Hides the vector until the pixels resolve, so the crossfade reads as a transformation. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-bg" style={{ opacity: resolved ? 0 : 1, transition: "opacity .7s ease" }} />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
        style={{ opacity: resolved ? 0 : 1, transition: "opacity .7s ease" }}
      />
    </div>
  );
}
