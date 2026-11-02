"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Eye, Pause, Play, RotateCcw, ScanLine, Video, Gauge } from "lucide-react";
import { useSceneQuality } from "@/hooks/useSceneQuality";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import SceneFrame from "@/components/ui/SceneFrame";
import type { Telemetry } from "@/components/scenes/DuckiebotScene";

const DuckiebotScene = dynamic(() => import("@/components/scenes/DuckiebotScene"), { ssr: false });

const btn = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${
    active ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg"
  }`;

function Hud({ telemetry }: { telemetry: React.MutableRefObject<Telemetry> }) {
  const [t, setT] = useState<Telemetry>(telemetry.current);
  useEffect(() => {
    const id = window.setInterval(() => setT({ ...telemetry.current }), 120);
    return () => window.clearInterval(id);
  }, [telemetry]);
  return (
    <dl className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-line bg-bg/75 p-3 font-mono text-[11px] leading-5 backdrop-blur sm:text-xs" aria-live="off">
      <dt className="sr-only">Phase</dt>
      <dd className="mb-1 text-accent">{t.phase}</dd>
      <div className="grid grid-cols-[auto_auto] gap-x-3 text-muted">
        <dt>sim velocity</dt><dd className="text-fg">{t.v.toFixed(2)} u/s</dd>
        <dt>steering</dt><dd className="text-fg">{t.steerDeg.toFixed(1)}°</dd>
        <dt>lane offset</dt><dd className="text-fg">{t.offset.toFixed(2)} u</dd>
        <dt>camera FOV</dt><dd className="text-fg">{t.fov}°</dd>
      </div>
    </dl>
  );
}

/** 2D fallback: top-down simplified lane following (reduced motion / no WebGL / weak devices). */
function LaneFallback({ overlay, animate }: { overlay: boolean; animate: boolean }) {
  const path = "M20 150 C 110 150, 150 150, 190 120 S 270 60, 305 62";
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" role="img" aria-label="Simplified top-down animation of a robot following a lane">
      <rect width="320" height="200" fill="#0b0c0e" />
      <path d={path} fill="none" stroke="#1d2025" strokeWidth="56" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#f5c400" strokeWidth="2" strokeDasharray="10 9" />
      {overlay && (
        <>
          <path d="M20 122 C 110 122, 140 126, 172 98 S 262 36, 305 34" fill="none" stroke="#39c4d8" strokeWidth="2" />
          <path d="M20 178 C 110 178, 160 178, 208 142 S 280 86, 305 90" fill="none" stroke="#39c4d8" strokeWidth="2" />
          <path d="M20 164 C 110 164, 155 164, 199 131 S 275 73, 305 76" fill="none" stroke="#5dff9a" strokeWidth="2" strokeDasharray="4 4" />
        </>
      )}
      <g transform={animate ? undefined : "translate(150 140) rotate(-20)"}>
        <rect x="-12" y="-9" width="24" height="18" rx="3" fill="#f5c400" />
        <rect x="7" y="-4" width="6" height="8" rx="1" fill="#0b0c0e" />
        {animate && <animateMotion dur="6s" repeatCount="indefinite" rotate="auto" path={path} />}
      </g>
    </svg>
  );
}

export default function DuckiebotExperience() {
  const quality = useSceneQuality();
  const reduced = useReducedMotion();
  const [overlay, setOverlay] = useState(false);
  const [cameraMode, setCameraMode] = useState<"fp" | "tp">("fp");
  const [paused, setPaused] = useState(false);
  const [slowmo, setSlowmo] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const telemetry = useRef<Telemetry>({ phase: "Assembling", v: 0, steerDeg: 0, offset: 0, fov: 45 });

  const use3D = quality === "high" || quality === "low";

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-[#0b0c0e] sm:aspect-[16/9]">
        {quality === "pending" && <div className="absolute inset-0" aria-hidden />}
        {use3D && (
          <>
            <SceneFrame
              key={resetKey}
              quality={quality === "high" ? "high" : "low"}
              label="3D simulation: a detailed robot is assembled on a hover stage, dropped onto the field, switches on, then drives along a lane in a simulated environment."
              className="absolute inset-0"
              camera={{ position: [2.5, 1.7, 2.6], fov: 45, near: 0.05, far: 80 }}
              touchGate
              background="#07080b"
              shadows={quality === "high"}
              dpr={quality === "high" ? [1, 1.5] : undefined}
            >
              <DuckiebotScene cameraMode={cameraMode} overlay={overlay} paused={paused} slowmo={slowmo} telemetry={telemetry} fx={quality === "high"} />
            </SceneFrame>
            <Hud telemetry={telemetry} />
          </>
        )}
        {quality === "none" && (
          <div className="absolute inset-0">
            <LaneFallback overlay={overlay} animate={!reduced} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Simulation controls">
        <button type="button" aria-pressed={overlay} onClick={() => setOverlay((o) => !o)} className={btn(overlay)}>
          <ScanLine size={16} aria-hidden /> Toggle Computer Vision Overlay
        </button>
        {use3D && (
          <>
            <button type="button" onClick={() => setCameraMode((m) => (m === "fp" ? "tp" : "fp"))} className={btn(false)}>
              {cameraMode === "fp" ? <Eye size={16} aria-hidden /> : <Video size={16} aria-hidden />}
              {cameraMode === "fp" ? "First-person view" : "Third-person view"}
            </button>
            <button type="button" aria-pressed={paused} onClick={() => setPaused((p) => !p)} className={btn(paused)}>
              {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" aria-pressed={slowmo} onClick={() => setSlowmo((s) => !s)} className={btn(slowmo)}>
              <Gauge size={16} aria-hidden /> Slow motion
            </button>
            <button type="button" onClick={() => { setResetKey((k) => k + 1); setPaused(false); }} className={btn(false)}>
              <RotateCcw size={16} aria-hidden /> Reset
            </button>
          </>
        )}
      </div>

      <p className="mt-4 max-w-3xl text-sm text-muted">
        An interactive re-creation for this site: a stylized robot and a simplified steering model, with simulated
        overlay and numbers. The real project ran an HSV color-detection ROS node on a physical DB21J and streamed its
        camera feed to an MJPEG debugging dashboard.
        {quality === "none" && " Showing a simplified 2D version because 3D is unavailable or motion is reduced."}
      </p>
    </div>
  );
}
