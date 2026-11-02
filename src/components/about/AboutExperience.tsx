"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { FastForward, FolderClosed, RotateCcw, X } from "lucide-react";
import { profile } from "@/content/profile";
import { useSceneQuality } from "@/hooks/useSceneQuality";
import SceneFrame from "@/components/ui/SceneFrame";
import HelmetPortrait from "@/components/about/HelmetPortrait";

const USBTransformation = dynamic(() => import("@/components/scenes/USBTransformation"), { ssr: false });

const TABS = ["Profile", "Interests", "Skills", "Beyond Code"] as const;
type Tab = (typeof TABS)[number];

function ProfileScreen() {
  const [tab, setTab] = useState<Tab>("Profile");
  const [egg, setEgg] = useState(false);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[n]);
    refs.current[n]?.focus();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0a1118] shadow-2xl">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-[#0e161f] px-4 py-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <p className="ml-3 truncate font-mono text-xs text-accent">IDENTITY LOADED: {profile.name.toUpperCase()}</p>
      </div>

      <div className="grid md:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-8">
          <div role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-1 border-b border-line">
            {TABS.map((t, i) => (
              <button
                key={t}
                ref={(el) => { refs.current[i] = el; }}
                role="tab"
                id={`tab-${i}`}
                aria-selected={tab === t}
                aria-controls={`panel-${i}`}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => onKey(e, i)}
                className={`-mb-px min-h-11 border-b-2 px-4 text-sm transition-colors ${
                  tab === t ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="pt-6">
            <div role="tabpanel" id="panel-0" aria-labelledby="tab-0" hidden={tab !== "Profile"}>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="shrink-0"><HelmetPortrait /></div>
                <div>
                  <h2 className="text-2xl font-semibold">{profile.name}</h2>
                  <p className="mt-1 text-sm text-accent">{profile.headline} · {profile.school}</p>
                  <p className="mt-4 max-w-prose text-muted">{profile.intro}</p>
                  <p className="mt-4 max-w-prose text-muted">{profile.background}</p>
                </div>
              </div>
            </div>
            <div role="tabpanel" id="panel-1" aria-labelledby="tab-1" hidden={tab !== "Interests"}>
              <ul className="space-y-2">
                {profile.interests.map((i) => (
                  <li key={i} className="flex items-start gap-3 text-muted">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden={tab !== "Skills"}>
              <dl className="grid gap-5 sm:grid-cols-2">
                {Object.entries(profile.skills).map(([group, items]) => (
                  <div key={group}>
                    <dt className="eyebrow">{group}</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {items.map((s) => <span key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-fg/85">{s}</span>)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div role="tabpanel" id="panel-3" aria-labelledby="tab-3" hidden={tab !== "Beyond Code"}>
              <ul className="space-y-2">
                {profile.beyondCode.map((i) => (
                  <li key={i} className="flex items-start gap-3 text-muted">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* desktop icon: a harmless easter egg, tucked in the corner */}
        <div className="hidden items-end p-5 md:flex">
          <button
            type="button"
            onClick={() => setEgg(true)}
            className="group flex min-h-11 w-24 flex-col items-center gap-1 rounded-lg p-2 text-center text-[11px] text-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            <FolderClosed size={32} className="text-[#e0b252]" aria-hidden />
            <span className="font-mono">DO_NOT_OPEN</span>
          </button>
        </div>
        <div className="px-5 pb-5 md:hidden">
          <button type="button" onClick={() => setEgg(true)} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-muted hover:text-fg">
            <FolderClosed size={18} className="text-[#e0b252]" aria-hidden /> <span className="font-mono">DO_NOT_OPEN</span>
          </button>
        </div>
      </div>

      {egg && (
        <div role="dialog" aria-modal="false" aria-label="DO_NOT_OPEN" className="border-t border-line bg-[#0e161f] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-[#e0b252]">DO_NOT_OPEN/readme.txt</p>
              <p className="mt-2 text-sm text-muted">
                Nothing dangerous in here. Just a very serious folder of Pokémon team ideas.
              </p>
            </div>
            <button type="button" onClick={() => setEgg(false)} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-white/5">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AboutExperience() {
  const quality = useSceneQuality();
  // SSR / no-JS: the profile is visible. The intro hides it, then reveals it.
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(true);
  const [skip, setSkip] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (quality === "pending") return;
    if (quality === "none") { setPlaying(false); setDone(true); return; }
    setPlaying(true);
    setDone(false);
  }, [quality]);

  const onDone = useCallback(() => setDone(true), []);
  const replay = () => { setSkip(false); setDone(false); setPlaying(true); setRunKey((k) => k + 1); };

  return (
    <div className="relative">
      {playing && (
        <div className={`relative overflow-hidden rounded-2xl border border-line bg-[#06080d] transition-[opacity,height] duration-700 ${done ? "pointer-events-none h-0 border-0 opacity-0" : "aspect-[4/5] opacity-100 sm:aspect-[16/9]"}`}>
          {!done && (
          <SceneFrame
            key={runKey}
            quality={quality === "high" ? "high" : "low"}
            label="Animation: an ID card transforms into a USB drive, plugs into a computer, and the screen loads the profile below."
            className="absolute inset-0"
            camera={{ position: [0, 1.4, 7.4], fov: 40, near: 0.1, far: 60 }}
            pauseOffscreen
            background="#05070b"
            shadows={quality === "high"}
            dpr={quality === "high" ? [1, 1.5] : undefined}
          >
            <USBTransformation skip={skip} onDone={onDone} fx={quality === "high"} />
          </SceneFrame>
          )}
          <button
            type="button"
            onClick={() => setSkip(true)}
            className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-bg/70 px-3 text-sm text-muted backdrop-blur hover:text-fg"
          >
            <FastForward size={14} aria-hidden /> Skip
          </button>
        </div>
      )}

      <div
        className="transition-opacity duration-700"
        style={{ opacity: done ? 1 : 0, visibility: done ? "visible" : "hidden", height: done ? undefined : 0, overflow: done ? undefined : "hidden" }}
      >
        <ProfileScreen />
        {playing && (
          <button type="button" onClick={replay} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-muted hover:text-fg">
            <RotateCcw size={14} aria-hidden /> Replay intro
          </button>
        )}
      </div>
    </div>
  );
}
