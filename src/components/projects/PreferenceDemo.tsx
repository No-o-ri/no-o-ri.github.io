"use client";

import { useState } from "react";
import { JsonView } from "@/components/scenes/ComfyDriverScene";

// Deterministic, local mapping. Not model output. Values are illustrative.
const EXAMPLES: { text: string; json: Record<string, number> }[] = [
  { text: "I'm in no rush, take the scenic route.", json: { highway: 0.1, scenic: 0.9, traffic: 0.3, toll: 0.5, max_extra_minutes: 20 } },
  { text: "Get me there fast, tolls are fine.", json: { highway: 0.9, scenic: 0.1, traffic: 0.8, toll: 0.9, max_extra_minutes: 0 } },
  { text: "Avoid highways and tolls, even if it takes a bit longer.", json: { highway: 0.05, scenic: 0.5, traffic: 0.5, toll: 0, max_extra_minutes: 15 } },
  { text: "I hate stop-and-go traffic.", json: { highway: 0.6, scenic: 0.4, traffic: 0.95, toll: 0.5, max_extra_minutes: 10 } },
  { text: "Nothing special, just a normal route.", json: { highway: 0.5, scenic: 0.5, traffic: 0.5, toll: 0.5, max_extra_minutes: 5 } },
];

export default function PreferenceDemo() {
  const [i, setI] = useState(0);
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <p className="font-mono text-xs text-[#e0b252]">
        Simplified demo: a fixed lookup that mimics the behavior, not the real model.
      </p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div role="group" aria-label="Choose a driving preference statement">
          <p className="eyebrow mb-3">Say something</p>
          <ul className="space-y-2">
            {EXAMPLES.map((e, idx) => (
              <li key={e.text}>
                <button
                  type="button"
                  aria-pressed={i === idx}
                  onClick={() => setI(idx)}
                  className={`min-h-11 w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                    i === idx ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg"
                  }`}
                >
                  &ldquo;{e.text}&rdquo;
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Structured output</p>
          <div className="rounded-xl border border-[#26313d] bg-[#0d1117] p-4" aria-live="polite">
            <JsonView data={EXAMPLES[i].json} />
          </div>
        </div>
      </div>
    </div>
  );
}
