"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Home, Move3d, Plus, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useSceneQuality } from "@/hooks/useSceneQuality";
import SceneFrame from "@/components/ui/SceneFrame";
import type { MCmd } from "@/components/scenes/MaintenanceScene";
import { INITIAL_CASES, PARTS, makeIntakeCase, type CaseRecord, type CaseStatus } from "@/content/courtPartExample";

const MaintenanceScene = dynamic(() => import("@/components/scenes/MaintenanceScene"), { ssr: false });

const btn = (active = false) =>
  `inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${
    active ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg"
  }`;

// Status is shown as text + symbol, never by colour alone.
const STATUS: Record<CaseStatus, { mark: string; cls: string }> = {
  Active: { mark: "●", cls: "text-[#39c4d8]" },
  "Ready for trial": { mark: "■", cls: "text-[#7ee0a8]" },
  Adjourned: { mark: "▲", cls: "text-[#f0c36a]" },
};
const ORDER: CaseStatus[] = ["Active", "Ready for trial", "Adjourned"];
const next = (s: CaseStatus) => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];

function Panel({
  partId, cases, onAdvance, onIntake,
}: {
  partId: string | null; cases: CaseRecord[]; onAdvance: (id: string) => void; onIntake: () => void;
}) {
  const part = PARTS.find((p) => p.id === partId);
  const rows = part ? cases.filter((c) => c.part === part.id) : [];
  return (
    <div className="rounded-xl border border-line bg-surface p-5" aria-live="polite">
      {part ? (
        <>
          <p className="font-mono text-xs text-[#ff7a1a]">{part.calendar}</p>
          <h3 className="mt-1 text-xl font-semibold">{part.name}</h3>
          <p className="mt-1 text-sm text-muted">{rows.length} {rows.length === 1 ? "case" : "cases"} on calendar</p>
          <ul className="mt-4 space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                <span>
                  <span className="block font-mono text-xs">{c.docket}</span>
                  <span className={`text-xs ${STATUS[c.status].cls}`}><span aria-hidden>{STATUS[c.status].mark}</span> {c.status} · {c.nextDate}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onAdvance(c.id)}
                  aria-label={`Change status of ${c.docket}, currently ${c.status}`}
                  className="min-h-9 rounded-md border border-line px-2 text-xs text-muted hover:text-fg"
                >
                  Update
                </button>
              </li>
            ))}
            {rows.length === 0 && <li className="text-sm text-muted">No cases on this calendar.</li>}
          </ul>
          <button type="button" onClick={onIntake} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-bg">
            <Plus size={16} aria-hidden /> Add a case
          </button>
        </>
      ) : (
        <>
          <p className="eyebrow">Courthouse overview</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {ORDER.map((s) => (
              <li key={s} className={`flex justify-between ${STATUS[s].cls}`}>
                <span><span aria-hidden>{STATUS[s].mark}</span> {s}</span>
                <span className="font-mono">{cases.filter((c) => c.status === s).length}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Select a court part on the floor plan or from the list to see its calendar.</p>
        </>
      )}
      <p className="mt-4 font-mono text-[11px] text-[#e0b252]">Sample data. Not from the real tool.</p>
    </div>
  );
}

export default function MaintenanceExperience() {
  const quality = useSceneQuality();
  const [selected, setSelected] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>(INITIAL_CASES);
  const [intakeN, setIntakeN] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cmd, setCmd] = useState<MCmd>({ n: 0, type: "reset" });
  const [sceneKey, setSceneKey] = useState(0);

  const send = (type: MCmd["type"], dir?: number) => setCmd((c) => ({ n: c.n + 1, type, dir }));
  const use3D = quality === "high" || quality === "low";
  const counts = useMemo(() => Object.fromEntries(PARTS.map((p) => [p.id, cases.filter((c) => c.part === p.id).length])), [cases]);

  const advance = (id: string) => setCases((cs) => cs.map((c) => (c.id === id ? { ...c, status: next(c.status) } : c)));
  const intake = () => {
    setCases((cs) => [...cs, makeIntakeCase(intakeN, selected ?? PARTS[0].id)]);
    setIntakeN((n) => n + 1);
  };

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-[#071a33] sm:aspect-[16/10]">
            {use3D ? (
              <SceneFrame
                key={sceneKey}
                quality={quality === "high" ? "high" : "low"}
                label="3D courthouse floor plan with six court parts. Each case is a block colored by status. Select a part to inspect it; the same parts are listed beside the model."
                className="absolute inset-0"
                camera={{ position: [7.5, 9.5, 11], fov: 30, near: 0.1, far: 120 }}
                touchGate
                onPointerMissed={() => setSelected(null)}
                background="#071a33"
              >
                <MaintenanceScene cases={cases} selected={selected} autoRotate={autoRotate} cmd={cmd} onSelect={setSelected} />
              </SceneFrame>
            ) : (
              <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">
                {quality === "pending" ? "" : "The 3D floor plan is unavailable or motion is reduced. Use the part list to browse sample data."}
              </div>
            )}
            <p className="pointer-events-none absolute left-3 top-3 rounded-md border border-line bg-bg/70 px-2 py-1 font-mono text-[11px] text-[#e0b252] backdrop-blur">
              Illustrative floor plan · sample data
            </p>
          </div>

          {use3D && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Model controls">
              <button type="button" aria-pressed={autoRotate} className={btn(autoRotate)} onClick={() => setAutoRotate((r) => !r)}>
                <Move3d size={16} aria-hidden /> Rotate
              </button>
              <button type="button" className={btn()} onClick={() => send("zoom", 1)}><ZoomIn size={16} aria-hidden /> Zoom in</button>
              <button type="button" className={btn()} onClick={() => send("zoom", -1)}><ZoomOut size={16} aria-hidden /> Zoom out</button>
              <button type="button" className={btn()} onClick={() => { send("reset"); setSelected(null); setAutoRotate(false); }}><Home size={16} aria-hidden /> Reset view</button>
              <button type="button" className={btn()} onClick={() => { setCases(INITIAL_CASES); setIntakeN(0); setSelected(null); setSceneKey((k) => k + 1); }}>
                <RotateCcw size={16} aria-hidden /> Reset data
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div role="group" aria-label="Court parts">
            <p className="eyebrow mb-2">Court parts</p>
            <ul className="grid grid-cols-2 gap-1.5">
              {PARTS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={selected === p.id}
                    onClick={() => setSelected(selected === p.id ? null : p.id)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selected === p.id ? "border-[#ff7a1a] bg-[#ff7a1a]/10" : "border-line text-muted hover:text-fg"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="font-mono text-[11px] text-muted">{counts[p.id]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Panel partId={selected} cases={cases} onAdvance={advance} onIntake={intake} />
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-muted">
        This floor plan is an illustration of the kind of workflow the tool supports. Part names, dockets, statuses and dates are
        invented sample data. They are not from the real system or the DA&apos;s Office.
      </p>
    </div>
  );
}
