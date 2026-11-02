"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HardHat, UserRound } from "lucide-react";
import { asset } from "@/lib/asset";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Liquid helmet reveal. The portrait is plain until you move over it: a blob of liquid follows the cursor
 * (metaball field, spring-lagged head with a trail that recedes) and wherever it flows, parts of an original
 * circuit-livery racing helmet appear, edged with a thin teal rim. On first view an auto-demo swipes the
 * liquid across the face. Touch devices can drag (vertical scroll still works). "Show full helmet" floods it.
 * Reduced motion: helmet is shown statically. Helmet drawing is 300x400 units, matching the photo's 3:4 frame.
 */

const HELMET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="900" height="1200">
<defs>
<pattern id="c" width="44" height="44" patternUnits="userSpaceOnUse">
<rect width="44" height="44" fill="#0c131a"/>
<path d="M0 10H14L20 16H44M0 30H10L16 24H30L36 30H44M22 0V8M22 36V44" fill="none" stroke="#42d9d1" stroke-opacity="0.6" stroke-width="1.4"/>
<circle cx="14" cy="10" r="2" fill="#42d9d1" fill-opacity="0.85"/><circle cx="30" cy="24" r="2" fill="#42d9d1" fill-opacity="0.85"/><circle cx="22" cy="8" r="1.6" fill="#e0b252" fill-opacity="0.85"/>
</pattern>
<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1218"/><stop offset="0.55" stop-color="#050709"/><stop offset="1" stop-color="#0f2a2c"/></linearGradient>
</defs>
<g id="crown">
<path id="cr" d="M38 130 C26 58 58 -8 148 -8 C240 -8 266 60 254 130 L216 124 L150 136 L84 124 Z" fill="#0c131a"/>
<path d="M38 130 C26 58 58 -8 148 -8 C240 -8 266 60 254 130 L216 124 L150 136 L84 124 Z" fill="url(#c)"/>
<path d="M38 130 C26 58 58 -8 148 -8 C240 -8 266 60 254 130 L216 124 L150 136 L84 124 Z" fill="url(#s)" stroke="#42d9d1" stroke-opacity="0.9" stroke-width="1.5"/>
<path d="M96 20 C120 6 176 6 200 20" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="2" stroke-linecap="round"/>
<g id="ear"><path d="M46 118 L80 126 L78 206 L56 192 Z" fill="#0c131a"/><path d="M46 118 L80 126 L78 206 L56 192 Z" fill="url(#c)"/><path d="M46 118 L80 126 L78 206 L56 192 Z" fill="url(#s)" stroke="#42d9d1" stroke-opacity="0.9" stroke-width="1.3"/></g>
<g transform="translate(300 0) scale(-1 1)"><path d="M46 118 L80 126 L78 206 L56 192 Z" fill="#0c131a"/><path d="M46 118 L80 126 L78 206 L56 192 Z" fill="url(#c)"/><path d="M46 118 L80 126 L78 206 L56 192 Z" fill="url(#s)" stroke="#42d9d1" stroke-opacity="0.9" stroke-width="1.3"/></g>
<g transform="rotate(-1.5 150 124)"><rect x="100" y="112" width="100" height="14" rx="1.5" fill="#f3f5f7"/><text x="150" y="122.6" text-anchor="middle" font-family="monospace" font-weight="700" font-size="8.5" fill="#0c131a" letter-spacing="1.5">SN-01 · NORI</text></g>
</g>
<g id="chin">
<path d="M90 246 Q146 284 210 246 L208 264 Q148 304 92 264 Z" fill="#0a1017" stroke="#42d9d1" stroke-opacity="0.7" stroke-width="1.3"/>
<path d="M80 186 L208 186 L204 242 Q146 276 86 242 Z" fill="#0c131a"/>
<path d="M80 186 L208 186 L204 242 Q146 276 86 242 Z" fill="url(#c)"/>
<path d="M80 186 L208 186 L204 242 Q146 276 86 242 Z" fill="url(#s)" stroke="#42d9d1" stroke-opacity="0.9" stroke-width="1.5"/>
<rect x="118" y="214" width="14" height="3" rx="1.5" fill="#05070a"/><rect x="140" y="214" width="14" height="3" rx="1.5" fill="#05070a"/><rect x="162" y="214" width="14" height="3" rx="1.5" fill="#05070a"/>
<circle cx="144" cy="196" r="9" fill="#0c131a" stroke="#e0b252" stroke-width="1.4"/><text x="144" y="199.2" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="8.5" fill="#e0b252">SN</text>
</g>
<g id="visor">
<path d="M62 124 Q140 116 222 124 L218 156 Q142 166 66 156 Z" fill="url(#g)" stroke="#42d9d1" stroke-opacity="0.9" stroke-width="1.5"/>
<path d="M92 124 L124 123 L104 158 L74 158 Z" fill="#fff" opacity="0.16"/><path d="M150 123 L164 123 L146 160 L134 160 Z" fill="#fff" opacity="0.1"/>
<path d="M70 148 Q142 156 214 148" fill="none" stroke="#42d9d1" stroke-opacity="0.65" stroke-width="1"/>
<rect x="206" y="118" width="22" height="9" rx="1.5" fill="#42d9d1"/><text x="217" y="125" text-anchor="middle" font-family="monospace" font-weight="700" font-size="6" fill="#05070a">LIVE</text>
</g>
</svg>`;

const GW = 112, GH = 150; // metaball grid (upscaled with smoothing)
const ASPECT = 0.75;

type Blob = { x: number; y: number; r: number; age: number };

// auto-demo path: a swipe across crown, visor and chin
const DEMO: [number, number][] = [
  [0.22, 0.1], [0.5, 0.06], [0.8, 0.12], [0.82, 0.3], [0.55, 0.36], [0.2, 0.36], [0.28, 0.5], [0.52, 0.58], [0.76, 0.5], [0.5, 0.44],
];
const DEMO_T = 3.4;

function demoPoint(u: number): [number, number] {
  const n = DEMO.length - 1;
  const f = Math.min(0.9999, u) * n;
  const i = Math.floor(f);
  const t = f - i;
  const k = t * t * (3 - 2 * t);
  return [DEMO[i][0] + (DEMO[i + 1][0] - DEMO[i][0]) * k, DEMO[i][1] + (DEMO[i + 1][1] - DEMO[i][1]) * k];
}

export default function HelmetPortrait() {
  const reduced = useReducedMotion();
  const [figRef, seen] = useInViewOnce<HTMLElement>(0.45);
  const [full, setFull] = useState(false);
  const [hint, setHint] = useState(true);

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const helmet = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const st = useRef({
    blobs: [] as Blob[],
    lead: { x: 0.5, y: 0.3, vx: 0, vy: 0 },
    target: { x: 0.5, y: 0.3 },
    pointer: false,
    last: { x: 0.5, y: 0.3 },
    flood: 0,
    floodTarget: 0,
    demoT: -1,
    raf: 0,
    prev: 0,
  });
  const fullRef = useRef(false);
  fullRef.current = full;

  // rasterise the helmet drawing once
  useEffect(() => {
    const img = new Image();
    img.onload = () => { helmet.current = img; setReady(true); };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(HELMET_SVG)}`;
  }, []);

  const draw = useCallback(() => {
    const cv = canvas.current;
    const img = helmet.current;
    const w = wrap.current;
    if (!cv || !img || !w) return;
    const S = st.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(w.clientWidth * dpr), H = Math.round(w.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }

    // grids
    const maskC = (draw as unknown as { m?: HTMLCanvasElement }).m ?? ((draw as unknown as { m?: HTMLCanvasElement }).m = Object.assign(document.createElement("canvas"), { width: GW, height: GH }));
    const rimC = (draw as unknown as { r?: HTMLCanvasElement }).r ?? ((draw as unknown as { r?: HTMLCanvasElement }).r = Object.assign(document.createElement("canvas"), { width: GW, height: GH }));
    const layer = (draw as unknown as { l?: HTMLCanvasElement }).l ?? ((draw as unknown as { l?: HTMLCanvasElement }).l = document.createElement("canvas"));
    if (layer.width !== W || layer.height !== H) { layer.width = W; layer.height = H; }

    const mi = maskC.getContext("2d")!.createImageData(GW, GH);
    const ri = rimC.getContext("2d")!.createImageData(GW, GH);
    const bl = S.blobs;
    const n = bl.length;
    const bx = new Float32Array(n), by = new Float32Array(n), br = new Float32Array(n);
    for (let i = 0; i < n; i++) { bx[i] = bl[i].x; by[i] = bl[i].y; const R = bl[i].r / 0.454; br[i] = R * R; }
    const fl = S.flood * 3;
    const T0 = 0.5;
    const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    for (let j = 0; j < GH; j++) {
      const y = (j + 0.5) / GH;
      for (let i = 0; i < GW; i++) {
        const x = (i + 0.5) / GW;
        let f = fl;
        for (let k = 0; k < n; k++) {
          const dx = (x - bx[k]) * ASPECT, dy = y - by[k];
          const t = 1 - (dx * dx + dy * dy) / br[k];
          if (t > 0) f += t * t * t;
        }
        const o = (j * GW + i) * 4;
        const a = smooth(T0 - 0.07, T0 + 0.07, f);
        mi.data[o] = mi.data[o + 1] = mi.data[o + 2] = 255;
        mi.data[o + 3] = a * 255;
        // liquid rim + faint tint
        const rim = Math.exp(-Math.pow((f - T0) / 0.06, 2)) * (1 - S.flood);
        const tint = smooth(T0, T0 + 0.5, f) * 0.1 * (1 - S.flood);
        ri.data[o] = 90; ri.data[o + 1] = 235; ri.data[o + 2] = 228;
        ri.data[o + 3] = Math.min(255, (rim * 0.85 + tint) * 255);
      }
    }
    maskC.getContext("2d")!.putImageData(mi, 0, 0);
    rimC.getContext("2d")!.putImageData(ri, 0, 0);

    const lc = layer.getContext("2d")!;
    lc.globalCompositeOperation = "source-over";
    lc.clearRect(0, 0, W, H);
    lc.drawImage(img, 0, 0, W, H);
    lc.globalCompositeOperation = "destination-in";
    lc.imageSmoothingEnabled = true;
    lc.imageSmoothingQuality = "high";
    lc.drawImage(maskC, 0, 0, W, H);
    lc.globalCompositeOperation = "source-over";

    const c = cv.getContext("2d")!;
    c.clearRect(0, 0, W, H);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(layer, 0, 0);
    c.drawImage(rimC, 0, 0, W, H);
  }, []);

  const tick = useCallback((now: number) => {
    const S = st.current;
    const dt = Math.min(0.05, S.prev ? (now - S.prev) / 1000 : 0.016);
    S.prev = now;

    // auto-demo drives the target until the user takes over
    if (S.demoT >= 0 && !S.pointer) {
      S.demoT += dt;
      const [dx, dy] = demoPoint(S.demoT / DEMO_T);
      S.target.x = dx; S.target.y = dy;
      if (S.demoT > DEMO_T) S.demoT = -1;
    }
    const active = S.pointer || S.demoT >= 0;

    // spring-lagged lead
    const k = 70, c = 11;
    S.lead.vx += ((S.target.x - S.lead.x) * k - S.lead.vx * c) * dt;
    S.lead.vy += ((S.target.y - S.lead.y) * k - S.lead.vy * c) * dt;
    S.lead.x += S.lead.vx * dt;
    S.lead.y += S.lead.vy * dt;
    const speed = Math.hypot(S.lead.vx * ASPECT, S.lead.vy);

    if (active) {
      // lead blob (stretches a little with speed) + trail drops
      const dist = Math.hypot((S.lead.x - S.last.x) * ASPECT, S.lead.y - S.last.y);
      if (dist > 0.018) {
        S.blobs.push({ x: S.lead.x, y: S.lead.y, r: 0.07 + Math.min(0.045, speed * 0.04), age: 0 });
        S.last.x = S.lead.x; S.last.y = S.lead.y;
        if (S.blobs.length > 70) S.blobs.shift();
      }
    }
    // blobs recede like liquid draining
    for (const b of S.blobs) {
      b.age += dt;
      if (b.age > 0.35) b.r *= Math.exp(-dt * 1.5);
    }
    S.blobs = S.blobs.filter((b) => b.r > 0.012);
    // the live head always has a blob under it
    const headR = active ? 0.09 : 0;
    const drawBlobs = S.blobs;
    if (headR) drawBlobs.push({ x: S.lead.x, y: S.lead.y, r: headR, age: 0 });

    S.flood += (S.floodTarget - S.flood) * (1 - Math.exp(-dt * 4));
    draw();
    if (headR) drawBlobs.pop();

    const busy = active || S.blobs.length > 0 || Math.abs(S.flood - S.floodTarget) > 0.01;
    if (busy) S.raf = requestAnimationFrame(tick);
    else { S.raf = 0; S.prev = 0; }
  }, [draw]);

  const kick = useCallback(() => {
    const S = st.current;
    if (!S.raf) S.raf = requestAnimationFrame(tick);
  }, [tick]);

  // auto-demo when first seen
  useEffect(() => {
    if (!seen || !ready || reduced) return;
    const S = st.current;
    S.demoT = 0;
    S.lead.x = S.target.x = DEMO[0][0];
    S.lead.y = S.target.y = DEMO[0][1];
    S.last.x = S.lead.x; S.last.y = S.lead.y;
    kick();
  }, [seen, ready, reduced, kick]);

  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  // reduced motion: static helmet
  useEffect(() => {
    if (!reduced || !ready) return;
    st.current.flood = st.current.floodTarget = 1;
    draw();
  }, [reduced, ready, draw]);

  useEffect(() => {
    const S = st.current;
    S.floodTarget = full ? 1 : 0;
    if (ready && !reduced) kick();
  }, [full, ready, reduced, kick]);

  const onMove = (e: React.PointerEvent) => {
    if (reduced) return;
    const r = wrap.current!.getBoundingClientRect();
    const S = st.current;
    S.target.x = (e.clientX - r.left) / r.width;
    S.target.y = (e.clientY - r.top) / r.height;
    if (!S.pointer) { S.pointer = true; S.lead.x = S.target.x; S.lead.y = S.target.y; S.last.x = S.lead.x; S.last.y = S.lead.y; }
    setHint(false);
    kick();
  };
  const onLeave = () => { st.current.pointer = false; kick(); };

  return (
    <div className="w-full max-w-[280px]">
      <figure ref={figRef} className="m-0">
        <div
          ref={wrap}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={onLeave}
          onPointerCancel={onLeave}
          className="relative aspect-[3/4] w-full cursor-crosshair overflow-hidden rounded-xl border border-line bg-black"
          style={{ touchAction: "pan-y" }}
        >
          <img src={asset("/img/siddharth.jpg")} alt="Siddharth Nori" width={960} height={1280} className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
          {hint && !reduced && (
            <p aria-hidden className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-[11px] text-white/80 [text-shadow:0_1px_6px_rgba(0,0,0,.8)]">
              move over me
            </p>
          )}
        </div>
        <figcaption className="sr-only">Portrait of Siddharth Nori. Moving the pointer over it reveals parts of an animated circuit-pattern racing helmet.</figcaption>
      </figure>

      {!reduced && (
        <button
          type="button"
          onClick={() => setFull((f) => !f)}
          aria-pressed={full}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-muted transition-colors hover:text-fg"
        >
          {full ? <UserRound size={15} aria-hidden /> : <HardHat size={15} aria-hidden />}
          {full ? "Drain the helmet" : "Show full helmet"}
        </button>
      )}
    </div>
  );
}
