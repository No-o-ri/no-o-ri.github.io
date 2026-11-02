"use client";

import { useEffect, useState } from "react";

/**
 * pending – not yet measured (SSR / first paint): render lightweight placeholder
 * none    – no WebGL or reduced motion: static illustration only
 * low     – touch / modest hardware: simplified or 2D scene
 * high    – capable desktop: full 3D
 *
 * Override for testing: add ?quality=high|low|none to the URL.
 */
export type SceneQuality = "pending" | "none" | "low" | "high";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function detectQuality(): Exclude<SceneQuality, "pending"> {
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "high" || forced === "low" || forced === "none") return forced;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "none";
  if (!hasWebGL()) return "none";

  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);
  if (coarse || weak) return "low";
  return "high";
}

export function useSceneQuality(): SceneQuality {
  const [q, setQ] = useState<SceneQuality>("pending");
  useEffect(() => {
    setQ(detectQuality());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setQ(detectQuality());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return q;
}

/** True on touch-first devices; used to gate canvas interaction so page scrolling isn't trapped. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  return coarse;
}
