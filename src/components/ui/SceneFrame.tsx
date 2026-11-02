"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Hand, X } from "lucide-react";
import { useCoarsePointer, type SceneQuality } from "@/hooks/useSceneQuality";

type Props = {
  children: React.ReactNode;
  quality: Exclude<SceneQuality, "pending" | "none">;
  label: string; // accessible description of the scene
  className?: string;
  camera?: { position: [number, number, number]; fov?: number; near?: number; far?: number };
  /** On touch devices the canvas ignores touches until the user opts in, so page scroll is never trapped. */
  touchGate?: boolean;
  /** Pause rendering while off-screen (default true). */
  pauseOffscreen?: boolean;
  background?: string;
  onPointerMissed?: () => void;
  /** Enable shadow maps (hero scenes only). */
  shadows?: boolean;
  /** Override the device-pixel-ratio range for heavy post-processed scenes. */
  dpr?: [number, number];
};

/** One WebGL canvas with DPR cap, off-screen pausing, and touch gating. */
export default function SceneFrame({
  children,
  quality,
  label,
  className = "",
  camera = { position: [0, 0, 6], fov: 45 },
  touchGate = false,
  pauseOffscreen = true,
  background,
  onPointerMissed,
  shadows = false,
  dpr,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const coarse = useCoarsePointer();

  useEffect(() => {
    if (!pauseOffscreen || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [pauseOffscreen]);

  const gated = touchGate && coarse && !engaged;

  return (
    <div ref={ref} role="img" aria-label={label} className={className}>
      <div className={`absolute inset-0 ${gated ? "pointer-events-none" : ""}`}>
        <Canvas
          frameloop={visible ? "always" : "never"}
          shadows={shadows}
          dpr={dpr ?? (quality === "high" ? [1, 1.75] : 1)}
          camera={camera}
          gl={{ antialias: quality === "high", powerPreference: quality === "high" ? "high-performance" : "default" }}
          onPointerMissed={onPointerMissed}
          style={{ background }}
        >
          {children}
        </Canvas>
      </div>
      {touchGate && coarse && (
        <button
          type="button"
          onClick={() => setEngaged((e) => !e)}
          className="absolute bottom-3 right-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-bg/80 px-3 text-sm backdrop-blur"
        >
          {engaged ? <X size={16} aria-hidden /> : <Hand size={16} aria-hidden />}
          {engaged ? "Done" : "Tap to interact"}
        </button>
      )}
    </div>
  );
}
