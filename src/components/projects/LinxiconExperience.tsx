"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { FastForward, RotateCcw, RotateCw, Search, Tag, ZoomIn, ZoomOut, Home } from "lucide-react";
import { useSceneQuality } from "@/hooks/useSceneQuality";
import SceneFrame from "@/components/ui/SceneFrame";
import type { Cmd } from "@/components/scenes/LinxiconScene";
import { CLUSTERED, EDGES, GROUPS, NODES, neighborsOf } from "@/content/linxiconExample";

const LinxiconScene = dynamic(() => import("@/components/scenes/LinxiconScene"), { ssr: false });

const btn = (active = false) =>
  `inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${
    active ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg"
  }`;

/** 2D fallback: same example graph projected flat, with the same selection behaviour. */
function NetworkSvg({ selected, onSelect }: { selected: number | null; onSelect: (id: number | null) => void }) {
  const nb = selected === null ? null : new Set(neighborsOf(selected).map((n) => n.other));
  const P = (i: number) => ({ x: 200 + CLUSTERED[i][0] * 16 + CLUSTERED[i][2] * 3, y: 130 - CLUSTERED[i][1] * 11 });
  return (
    <svg viewBox="0 0 400 260" className="h-full w-full" role="group" aria-label="Flat view of the example word network">
      <rect width="400" height="260" fill="#05071a" onClick={() => onSelect(null)} />
      {EDGES.map((e, i) => {
        const a = P(e.a), b = P(e.b);
        const inc = selected !== null && (e.a === selected || e.b === selected);
        const bend = i % 2 ? 0.22 : -0.22;
        const cx = (a.x + b.x) / 2 - (b.y - a.y) * bend, cy = (a.y + b.y) / 2 + (b.x - a.x) * bend;
        return <path key={i} d={`M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`} fill="none" stroke={GROUPS[NODES[e.a].group].color} strokeOpacity={selected === null ? 0.5 : inc ? 0.95 : 0.07} strokeWidth={inc ? 1.8 : 1.1} />;
      })}
      {NODES.map((n) => {
        const p = P(n.id);
        const dim = selected !== null && n.id !== selected && !nb?.has(n.id);
        return (
          <g key={n.id} opacity={dim ? 0.25 : 1} onClick={() => onSelect(selected === n.id ? null : n.id)} style={{ cursor: "pointer" }}>
            <circle cx={p.x} cy={p.y} r={n.hub ? 12 : 8} fill={GROUPS[n.group].color} opacity={0.22} />
            <circle cx={p.x} cy={p.y} r={n.hub ? 6 : 4} fill={n.id === selected ? "#fff" : GROUPS[n.group].color} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fill="#eef0ff" fontFamily="sans-serif">{n.word}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function LinxiconExperience() {
  const quality = useSceneQuality();
  const [selected, setSelected] = useState<number | null>(null);
  const [labels, setLabels] = useState(false);
  const [query, setQuery] = useState("");
  const [cmd, setCmd] = useState<Cmd>({ n: 0, type: "reset" });
  const [introDone, setIntroDone] = useState(false);
  const [skip, setSkip] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  const send = (type: Cmd["type"], dir?: number) => setCmd((c) => ({ n: c.n + 1, type, dir }));
  const use3D = quality === "high" || quality === "low";

  const onSearch = (q: string) => {
    setQuery(q);
    const s = q.trim().toLowerCase();
    if (!s) return;
    const hit = NODES.find((n) => n.word === s) ?? NODES.find((n) => n.word.startsWith(s));
    if (hit) setSelected(hit.id);
  };

  const rows = useMemo(() => {
    const s = query.trim().toLowerCase();
    return NODES.filter((n) => !s || n.word.includes(s) || GROUPS[n.group].name.toLowerCase().includes(s));
  }, [query]);

  const sel = selected === null ? null : NODES[selected];
  const selNeighbors = selected === null ? [] : neighborsOf(selected);

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-[#05071a] sm:aspect-[16/9]">
        {use3D && (
          <SceneFrame
            key={sceneKey}
            quality={quality === "high" ? "high" : "low"}
            label="Interactive 3D network of example words. Select a word to highlight its connections. A searchable list of the same words is below."
            className="absolute inset-0"
            camera={{ position: [0, 2.2, 11], fov: 45, near: 0.1, far: 120 }}
            touchGate
            onPointerMissed={() => setSelected(null)}
            background="#05071a"
          >
            <LinxiconScene selected={selected} showLabels={labels} cmd={cmd} skipIntro={skip} fancy={quality === "high"} onSelect={setSelected} onIntroDone={() => setIntroDone(true)} />
          </SceneFrame>
        )}
        {quality === "none" && <NetworkSvg selected={selected} onSelect={setSelected} />}
        <p className="pointer-events-none absolute left-3 top-3 rounded-md border border-line bg-bg/70 px-2 py-1 font-mono text-[11px] text-[#e6c35c] backdrop-blur">
          Sample words · re-created for this site
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Word groups">
        {GROUPS.map((g) => (
          <li key={g.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: g.color, boxShadow: `0 0 8px ${g.color}` }} aria-hidden />
            {g.name} <span className="opacity-70">({g.kind === "anime" ? "anime" : "everyday words"})</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Network controls">
        <label className="relative flex min-h-11 items-center">
          <span className="sr-only">Search for a word</span>
          <Search size={16} className="pointer-events-none absolute left-3 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search a word"
            className="min-h-11 w-48 rounded-md border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted"
          />
        </label>
        {use3D && (
          <>
            <button type="button" className={btn()} onClick={() => send("zoom", 1)}><ZoomIn size={16} aria-hidden /> Zoom in</button>
            <button type="button" className={btn()} onClick={() => send("zoom", -1)}><ZoomOut size={16} aria-hidden /> Zoom out</button>
            <button type="button" className={btn()} onClick={() => send("rotate", -1)}><RotateCcw size={16} aria-hidden /> Rotate left</button>
            <button type="button" className={btn()} onClick={() => send("rotate", 1)}><RotateCw size={16} aria-hidden /> Rotate right</button>
            <button type="button" className={btn()} onClick={() => { send("reset"); setSelected(null); }}><Home size={16} aria-hidden /> Reset camera</button>
          </>
        )}
        <button type="button" aria-pressed={labels} className={btn(labels)} onClick={() => setLabels((l) => !l)}>
          <Tag size={16} aria-hidden /> Connection labels
        </button>
        {use3D && !introDone && (
          <button type="button" className={btn()} onClick={() => setSkip(true)}><FastForward size={16} aria-hidden /> Skip intro</button>
        )}
        {use3D && introDone && (
          <button type="button" className={btn()} onClick={() => { setIntroDone(false); setSkip(false); setSelected(null); setSceneKey((k) => k + 1); }}>
            <RotateCcw size={16} aria-hidden /> Replay intro
          </button>
        )}
      </div>

      <div className="mt-3 min-h-[3.5rem] text-sm" aria-live="polite">
        {sel ? (
          <p>
            <span className="font-semibold" style={{ color: GROUPS[sel.group].color }}>{sel.word}</span>{" "}
            <span className="text-muted">({GROUPS[sel.group].name}) is connected to:</span>{" "}
            {selNeighbors.map((n, i) => (
              <span key={n.other}>
                {i > 0 && ", "}
                {NODES[n.other].word} <span className="text-muted">({n.rel})</span>
              </span>
            ))}
            .
          </p>
        ) : (
          <p className="text-muted">Select a word to see its direct connections. The rest of the network dims.</p>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-line bg-surface p-4" open={quality === "none"}>
        <summary className="cursor-pointer text-sm font-medium">Text version: example words and connections</summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">Example words, their group, and direct connections</caption>
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-2 pr-4 font-normal">Word</th>
                <th scope="col" className="py-2 pr-4 font-normal">Group</th>
                <th scope="col" className="py-2 font-normal">Connected to</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className={`border-b border-line/60 ${selected === n.id ? "bg-accent/10" : ""}`}>
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <button type="button" className="min-h-8 underline-offset-4 hover:underline" aria-pressed={selected === n.id} onClick={() => setSelected(selected === n.id ? null : n.id)}>
                      {n.word}
                    </button>
                  </th>
                  <td className="py-2 pr-4 text-muted">{GROUPS[n.group].name}</td>
                  <td className="py-2 text-muted">{neighborsOf(n.id).map((x) => `${NODES[x.other].word} (${x.rel})`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-3 text-muted">No example word matches &ldquo;{query}&rdquo;.</p>}
        </div>
      </details>

      <p className="mt-4 max-w-3xl text-sm text-muted">
        Linxicon embedded an anime dataset alongside everyday words in one space, so terms like &ldquo;luffy&rdquo; land
        near &ldquo;ocean&rdquo; and &ldquo;nakama&rdquo; near &ldquo;friendship&rdquo;. The words, connections and
        positions shown here are a small hand-written example for the visualization. They are not Linxicon&apos;s
        actual output.
      </p>
    </div>
  );
}
