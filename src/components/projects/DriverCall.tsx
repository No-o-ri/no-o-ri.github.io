"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Volume2, VolumeX, Music2 } from "lucide-react";
import { JsonView } from "@/components/scenes/ComfyDriverScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { NoirAudio } from "@/lib/noirAudio";

/**
 * "Call the driver": a scripted, detective-style phone call to ComfyDriver.
 * Audio is opt-in (off by default): original generative noir track + browser text-to-speech voices.
 * Everything is ILLUSTRATIVE: a fixed script, not a live model and not output from the real system.
 */

type Line = { who: "driver" | "rider"; text: string; json?: Record<string, number>; route?: boolean };

const SCRIPT: Line[] = [
  { who: "driver", text: "ComfyDriver. Where to, and how do you want to get there?" },
  {
    who: "rider",
    text: "Downtown. Without highway stress. Scenic if you can. I'm okay adding a few minutes.",
    json: { highway: 0.25, scenic: 0.75, max_extra_minutes: 10 },
  },
  {
    who: "driver",
    text: "Understood. I'm keeping you off the highway and taking the coast road. That adds about six minutes.",
    json: { highway: 0.25, scenic: 0.75, traffic: 0.5, toll: 0.25, max_extra_minutes: 10 },
    route: true,
  },
  { who: "rider", text: "Perfect. And no tolls.", json: { highway: 0.25, scenic: 0.75, traffic: 0.5, toll: 0, max_extra_minutes: 10 } },
  { who: "driver", text: "Tolls are off the table. Route locked. Sit back." },
];

const HIGHWAY = "M40 205 C 150 195, 260 120, 360 108 S 520 86, 570 64";
const SCENIC = "M40 205 C 90 262, 200 250, 250 196 S 330 128, 400 160 S 500 70, 570 64";

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function pickVoice(kind: "driver" | "rider"): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const v = speechSynthesis.getVoices().filter((x) => x.lang.toLowerCase().startsWith("en"));
  if (!v.length) return null;
  const pref = kind === "driver"
    ? /(daniel|google uk english male|male|alex|fred)/i
    : /(samantha|google us english|female|zira|karen|moira)/i;
  return v.find((x) => pref.test(x.name)) ?? (kind === "driver" ? v[0] : v[Math.min(1, v.length - 1)]);
}

export default function DriverCall() {
  const reduced = useReducedMotion();
  const [audio, setAudio] = useState(false);
  const [phase, setPhase] = useState<"idle" | "dialing" | "live" | "ended">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [json, setJson] = useState<Record<string, number>>({});
  const [route, setRoute] = useState(false);
  const [secs, setSecs] = useState(0);

  const engine = useRef<NoirAudio | null>(null);
  const run = useRef(0);
  const audioRef = useRef(false);
  const pathRef = useRef<SVGPathElement>(null);
  const carRef = useRef<SVGCircleElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  audioRef.current = audio;

  const toggleAudio = useCallback(async () => {
    if (audioRef.current) {
      engine.current?.dispose();
      engine.current = null;
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      setAudio(false);
      return;
    }
    const { NoirAudio } = await import("@/lib/noirAudio");
    const a = new NoirAudio();
    await a.resume();
    a.startMusic();
    engine.current = a;
    setAudio(true);
  }, []);

  useEffect(() => () => {
    run.current++;
    engine.current?.dispose();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }, []);

  // preload voices (some browsers load them lazily)
  useEffect(() => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [lines, reduced]);

  // car dot travels the chosen route
  useEffect(() => {
    const path = pathRef.current;
    const car = carRef.current;
    if (!path || !car || !route) return;
    const len = path.getTotalLength();
    if (reduced) {
      const p = path.getPointAtLength(len);
      car.setAttribute("cx", String(p.x)); car.setAttribute("cy", String(p.y));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = ((now - start) / 7000) % 1;
      const p = path.getPointAtLength(k * len);
      car.setAttribute("cx", String(p.x));
      car.setAttribute("cy", String(p.y));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [route, reduced]);

  const speak = useCallback(async (line: Line, id: number) => {
    const fallback = 700 + line.text.length * 32;
    if (!audioRef.current || typeof speechSynthesis === "undefined") { await wait(fallback); return; }
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(line.text);
      const v = pickVoice(line.who);
      if (v) u.voice = v;
      u.rate = line.who === "driver" ? 0.92 : 1;
      u.pitch = line.who === "driver" ? 0.7 : 1;
      u.volume = 1;
      const done = () => { engine.current?.duck(false); resolve(); };
      u.onstart = () => engine.current?.duck(true);
      u.onend = done;
      u.onerror = done;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      window.setTimeout(() => { if (run.current !== id) { speechSynthesis.cancel(); done(); } }, fallback * 3);
    });
  }, []);

  const hangUp = useCallback(() => {
    run.current++;
    engine.current?.stopRinging();
    engine.current?.click();
    engine.current?.duck(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setPhase("ended");
  }, []);

  const call = useCallback(async () => {
    const id = ++run.current;
    setLines([]); setJson({}); setRoute(false); setSecs(0);
    setPhase("dialing");
    engine.current?.startRinging();
    await wait(audioRef.current ? 3300 : 1600);
    if (run.current !== id) return;
    engine.current?.stopRinging();
    engine.current?.click();
    setPhase("live");
    for (const line of SCRIPT) {
      if (run.current !== id) return;
      setLines((l) => [...l, line]);
      await speak(line, id);
      if (run.current !== id) return;
      if (line.json) setJson(line.json);
      if (line.route) setRoute(true);
      await wait(350);
    }
    if (run.current !== id) return;
    engine.current?.click();
    setPhase("ended");
  }, [speak]);

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const busy = phase === "dialing" || phase === "live";

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Call the driver</p>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Ring ComfyDriver and say how you want to drive. Turn audio on for the voices and an original noir track
            synthesised in your browser. Captions are always shown.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAudio}
          aria-pressed={audio}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${audio ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg"}`}
        >
          {audio ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
          {audio ? "Audio on" : "Enable audio"}
          {audio && <Music2 size={14} aria-hidden className="text-accent" />}
        </button>
      </div>
      <p className="mt-3 font-mono text-xs text-[#e0b252]">
        Scripted demo of the idea, not live model output. Voices use your browser&apos;s text-to-speech.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Phone */}
        <div className="flex min-h-[360px] flex-col rounded-xl border border-line bg-bg p-4">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
              {phase === "dialing" && <span aria-hidden className="absolute inset-0 rounded-full bg-accent/30 motion-safe:animate-ping" />}
              <Phone size={20} aria-hidden />
            </div>
            <div>
              <p className="font-medium">ComfyDriver</p>
              <p className="font-mono text-xs text-muted" aria-live="polite">
                {phase === "idle" && "Ready to call"}
                {phase === "dialing" && "Ringing…"}
                {phase === "live" && `Connected · ${mmss}`}
                {phase === "ended" && `Call ended · ${mmss}`}
              </p>
            </div>
          </div>

          <div ref={logRef} role="log" aria-live="polite" aria-label="Call transcript" className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            {lines.length === 0 && <p className="text-sm text-muted">{phase === "idle" ? "Press call to start." : "…"}</p>}
            {lines.map((l, i) => (
              <div key={i} className={`flex ${l.who === "rider" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${l.who === "rider" ? "bg-accent/15 text-fg" : "border border-line text-fg"}`}>
                  <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-widest text-muted">{l.who === "rider" ? "You" : "ComfyDriver"}</span>
                  {l.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {busy ? (
              <button type="button" onClick={hangUp} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#b3362e] px-4 text-sm font-medium text-white hover:opacity-90">
                <PhoneOff size={16} aria-hidden /> Hang up
              </button>
            ) : (
              <button type="button" onClick={call} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-bg hover:opacity-90">
                <Phone size={16} aria-hidden /> {phase === "ended" ? "Call again" : "Call ComfyDriver"}
              </button>
            )}
          </div>
        </div>

        {/* Route + JSON */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-bg p-3">
            <svg viewBox="0 0 620 290" role="img" aria-label={route ? "Map: the scenic route is selected, about six minutes longer than the highway." : "Map: a fast highway route and a longer scenic route between two points."} className="h-auto w-full">
              <rect width="620" height="290" fill="#0f0c09" rx="10" />
              {Array.from({ length: 10 }, (_, i) => <line key={`h${i}`} x1="0" x2="620" y1={i * 32} y2={i * 32} stroke="#2a2118" strokeWidth="1" />)}
              {Array.from({ length: 20 }, (_, i) => <line key={`v${i}`} y1="0" y2="290" x1={i * 32} x2={i * 32} stroke="#2a2118" strokeWidth="1" />)}
              <path d="M0 250 C 120 280, 220 270, 300 250 S 480 230, 620 270 L620 290 L0 290Z" fill="#102028" opacity="0.7" />
              <path d={HIGHWAY} fill="none" stroke={route ? "#4b4036" : "#a79a82"} strokeWidth="5" strokeLinecap="round" strokeDasharray={route ? "2 9" : "none"} style={{ transition: "stroke 0.6s" }} />
              <path ref={pathRef} d={SCENIC} fill="none" stroke="#d0645c" strokeWidth="5" strokeLinecap="round" pathLength={100}
                strokeDasharray="100" strokeDashoffset={route ? 0 : 100} style={{ transition: reduced ? "none" : "stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)", filter: "drop-shadow(0 0 5px rgba(208,100,92,.7))" }} />
              <circle cx="40" cy="205" r="7" fill="#efe6d2" />
              <circle cx="570" cy="64" r="7" fill="#efe6d2" />
              <text x="40" y="228" fill="#b8aa90" fontSize="12" fontFamily="monospace" textAnchor="middle">YOU</text>
              <text x="570" y="48" fill="#b8aa90" fontSize="12" fontFamily="monospace" textAnchor="middle">DOWNTOWN</text>
              {route && <circle ref={carRef} r="6" fill="#fff" stroke="#d0645c" strokeWidth="3" cx="40" cy="205" />}
              <text x="310" y="22" fill="#efe6d2" fontSize="14" fontFamily="monospace" textAnchor="middle">
                {route ? "Scenic · 30 min (+6)" : "Fastest · 24 min (highway)"}
              </text>
            </svg>
          </div>
          <div className="rounded-xl border border-[#26313d] bg-[#0d1117] p-4" aria-live="polite">
            <p className="mb-2 font-mono text-[11px] text-[#6e7681]">{"// preferences extracted from the call"}</p>
            {Object.keys(json).length ? <JsonView data={json} /> : <p className="font-mono text-sm text-[#6e7681]">waiting for the rider…</p>}
          </div>
        </div>
      </div>
      {audio && <p className="mt-4 text-xs text-muted">Track: &ldquo;Midnight Detour&rdquo;, an original generative piece (walking bass, Rhodes, brushes, muted lead) made live in your browser.</p>}
    </div>
  );
}
