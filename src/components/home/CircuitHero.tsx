"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion as useMotionReduced, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, FastForward } from "lucide-react";
import { profile } from "@/content/profile";
import { useSceneQuality } from "@/hooks/useSceneQuality";
import SceneFrame from "@/components/ui/SceneFrame";

const NeuralScene = dynamic(() => import("@/components/scenes/NeuralScene"), { ssr: false });

const SEEN_KEY = "sn-intro-seen";
const SHAPE_NAMES = ["Sphere", "SN", "Network", "Knot", "Helix"];
const ROLES = ["local-LLM systems", "autonomous robots", "EEG research", "3D web tools", "hackathons"];

// SVG fallback (mobile / low-end / reduced motion / no WebGL): concentric rings that draw in.
function SvgScene({ playing }: { playing: boolean }) {
  const rings = [90, 160, 230, 300];
  return (
    <svg aria-hidden viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 h-full w-full">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#42d9d1" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#42d9d1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="600" cy="350" r="380" fill="url(#glow)" />
      {rings.map((r, i) => (
        <circle
          key={r} cx="600" cy="350" r={r} fill="none" stroke={i % 2 ? "#6d85ff" : "#42d9d1"} strokeOpacity="0.35" strokeWidth="1.5"
          pathLength={100} strokeDasharray={playing ? "100" : "2 3"} strokeDashoffset={playing ? 100 : 0}
          style={{ animation: playing ? `hero-ring 2.4s ease ${i * 0.2}s forwards` : undefined, transformOrigin: "600px 350px" }}
        />
      ))}
      <style>{`@keyframes hero-ring { to { stroke-dashoffset: 0 } }`}</style>
    </svg>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&<>/";

/** Resolves the text left to right out of random glyphs whenever `active` goes false → true. */
function DecodeText({ text, active }: { text: string; active: boolean }) {
  const [out, setOut] = useState(text);
  const prev = useRef(active);
  useEffect(() => {
    const was = prev.current;
    prev.current = active;
    if (!active || was) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const fixed = Math.floor(((now - start) / 1100) * text.length);
      setOut([...text].map((ch, i) => (ch === " " || i < fixed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
      if (fixed < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, text]);
  return <>{out}</>;
}

/** Types and erases each role in turn. Static first role for SSR / reduced motion. */
function RoleTyper({ active }: { active: boolean }) {
  const reduced = useMotionReduced();
  const [text, setText] = useState(ROLES[0]);
  useEffect(() => {
    if (!active || reduced) return;
    let role = 0, len = 0, dir = 1;
    let timer = 0;
    const step = () => {
      const word = ROLES[role];
      len += dir;
      setText(word.slice(0, len));
      let wait = dir === 1 ? 55 : 28;
      if (dir === 1 && len === word.length) { dir = -1; wait = 1500; }
      else if (dir === -1 && len === 0) { dir = 1; role = (role + 1) % ROLES.length; wait = 280; }
      timer = window.setTimeout(step, wait);
    };
    setText("");
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [active, reduced]);
  return (
    <p className="mt-6 font-mono text-base text-fg sm:text-lg">
      <span className="text-muted">$ building </span>
      <span className="text-accent">{text}</span>
      <span aria-hidden className="ml-0.5 inline-block h-[1.1em] w-[0.55ch] translate-y-[0.2em] bg-accent" style={{ animation: "hero-caret 1s steps(1) infinite" }} />
    </p>
  );
}

export default function CircuitHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useMotionReduced();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const fadeOut = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const liftOut = useTransform(scrollYProgress, [0, 0.55], [0, -90]);
  const [first, ...rest] = profile.name.split(" ");
  const quality = useSceneQuality();
  // SSR / no-JS: identity text visible, final state. Intro hides then reveals it.
  const [mode, setMode] = useState<"play" | "final">("final");
  const [revealed, setRevealed] = useState(true);
  const [decided, setDecided] = useState(false);
  const [shape, setShape] = useState(0);

  useEffect(() => {
    if (quality === "pending") return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch {}
    const instant = quality === "none" || seen;
    setMode(instant ? "final" : "play");
    setRevealed(instant);
    setDecided(true);
  }, [quality]);

  const markSeen = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
  }, []);

  const onReveal = useCallback(() => setRevealed(true), []);
  const onDone = useCallback(() => { setMode("final"); markSeen(); }, [markSeen]);
  const skip = useCallback(() => { setRevealed(true); setMode("final"); markSeen(); }, [markSeen]);

  // Fallback timeline for the SVG version (no scene callbacks there).
  useEffect(() => {
    if (!decided || mode !== "play" || quality === "high") return;
    const a = window.setTimeout(() => setRevealed(true), 2600);
    const b = window.setTimeout(onDone, 3600);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [decided, mode, quality, onDone]);

  const use3D = decided && quality === "high";
  const playing = mode === "play";

  // After the intro, the particles keep morphing; picking a shape restarts the timer.
  useEffect(() => {
    if (!use3D || playing) return;
    const t = window.setTimeout(() => setShape((x) => (x + 1) % SHAPE_NAMES.length), 7000);
    return () => window.clearTimeout(t);
  }, [use3D, playing, shape]);

  // Cursor spotlight: CSS vars only, no re-render.
  const onSpot = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  return (
    <section ref={sectionRef} onPointerMove={onSpot} aria-label="Introduction" className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* Blueprint grid + cursor spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-60 [background-image:linear-gradient(rgba(66,217,209,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(66,217,209,.07)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_80%_70%_at_35%_45%,#000_20%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{ background: "radial-gradient(520px circle at var(--mx, 70%) var(--my, 40%), rgba(66,217,209,.10), transparent 65%)" }}
      />
      {use3D ? (
        <SceneFrame
          quality="high"
          label="Animated 3D particle sphere that assembles from scattered points and reacts to the cursor."
          className="absolute inset-0 -z-10"
          camera={{ position: [0, 0, 9.5], fov: 45, near: 0.1, far: 80 }}
          pauseOffscreen
          dpr={[1, 1.5]}
        >
          <NeuralScene mode={mode} shape={shape} onReveal={onReveal} onDone={onDone} />
        </SceneFrame>
      ) : (
        <SvgScene playing={decided && playing} />
      )}
      {/* Keeps text legible over the board */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-bg/75 via-bg/25 to-transparent" />
      {/* Melts the board into the page below */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-bg" />

      <motion.div className="container-x relative py-28" style={reducedMotion ? undefined : { opacity: fadeOut, y: liftOut }}>
        <div className="max-w-3xl">
        <div
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "none" : "translateY(12px)",
            transition: "opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s",
          }}
        >
          <p className="eyebrow">{profile.headline} | {profile.school}</p>
          <h1 aria-label={profile.name} className="mt-5 text-[clamp(3rem,1.2rem+6vw,6.5rem)] font-[750] uppercase leading-[0.9] tracking-[-0.035em]">
            <span aria-hidden className="block"><DecodeText text={first} active={revealed} /></span>
            <span aria-hidden className="block text-transparent [-webkit-text-stroke:1.5px_var(--accent)] [text-shadow:0_0_40px_rgba(66,217,209,.25)]">
              <DecodeText text={rest.join(" ")} active={revealed} />
            </span>
          </h1>
          <RoleTyper active={revealed && decided} />
          <p className="mt-4 max-w-xl text-lg text-muted">{profile.tagline}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/#work" className="rounded-md bg-accent px-6 py-3 font-medium text-bg transition-opacity hover:opacity-90">
              Explore My Work
            </Link>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line bg-bg/40 px-6 py-3 backdrop-blur transition-colors hover:border-accent hover:text-accent">
              View Resume <ArrowUpRight size={16} aria-hidden />
            </a>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            <li><a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-accent">GitHub <ArrowUpRight size={12} aria-hidden /></a></li>
            <li><a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-accent">LinkedIn <ArrowUpRight size={12} aria-hidden /></a></li>
            <li><a href={`mailto:${profile.email}`} className="transition-colors hover:text-accent">{profile.email}</a></li>
          </ul>
        </div>

        </div>

        {playing && decided && (
          <button
            type="button"
            onClick={skip}
            className="absolute bottom-8 right-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-bg/70 px-3 text-sm text-muted backdrop-blur transition-colors hover:text-fg sm:right-10"
          >
            <FastForward size={14} aria-hidden /> Skip intro
          </button>
        )}
      </motion.div>

      {revealed && !playing && (
        <div className="container-x absolute inset-x-0 bottom-6 flex items-end justify-between" style={{ animation: "hero-hud-in 1s ease 0.6s both" }}>
          {use3D ? (
            <div role="group" aria-label="Particle shape" className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span className="mr-1 hidden text-muted sm:inline">Morph</span>
              {SHAPE_NAMES.map((n, i) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={shape === i}
                  onClick={() => setShape(i)}
                  className={`rounded-full border px-3 py-1.5 backdrop-blur transition-colors ${shape === i ? "border-accent bg-accent/15 text-accent" : "border-line bg-bg/50 text-muted hover:text-fg"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : <span />}
          <a href="#highlights" className="group ml-auto inline-flex flex-col items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted hover:text-fg">
            {use3D ? "Scroll to dive in" : "Scroll"}
            <span aria-hidden className="relative h-10 w-px overflow-hidden bg-line">
              <span className="absolute inset-x-0 top-0 h-4 bg-accent" style={{ animation: "hero-scroll-cue 1.8s ease-in-out infinite" }} />
            </span>
          </a>
        </div>
      )}
      <style>{`
        @keyframes hero-hud-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes hero-caret { 50% { opacity: 0 } }
        @keyframes hero-scroll-cue { from { transform: translateY(-100%) } to { transform: translateY(250%) } }
      `}</style>
    </section>
  );
}
