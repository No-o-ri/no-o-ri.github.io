"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { experience } from "@/content/experience";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Scattered "network" positions; they settle onto the timeline spine on scroll-in.
const NET: [number, number][] = [[28, 20], [92, 54], [40, 98], [100, 130], [30, 176]];

/** Connected nodes that line up into the timeline spine. */
function NetworkToTimeline({ on }: { on: boolean }) {
  const reduced = useReducedMotion();
  const settled = on || reduced;
  const n = experience.length;
  const spine = (i: number): [number, number] => [20, 20 + (i * 160) / Math.max(1, n - 1)];
  const pos = (i: number) => (settled ? spine(i) : NET[i % NET.length]);
  const tr = reduced ? "none" : "all 1s cubic-bezier(.3,.7,.2,1)";
  return (
    <svg aria-hidden viewBox="0 0 120 200" className="h-[200px] w-[120px] shrink-0">
      {experience.slice(1).map((_, i) => {
        const [x1, y1] = pos(i);
        const [x2, y2] = pos(i + 1);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#26313d" strokeWidth="1.5" style={{ transition: tr }} />;
      })}
      {experience.map((e, i) => {
        const [cx, cy] = pos(i);
        return <circle key={e.org} cx={cx} cy={cy} r="5" fill="#111720" stroke="#42d9d1" strokeWidth="2" style={{ transition: tr }} />;
      })}
    </svg>
  );
}

export default function ExperiencePreview() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>(0.4);
  return (
    <section aria-labelledby="exp-heading" className="container-x">
      <p className="eyebrow">Experience</p>
      <h2 id="exp-heading" className="h2 mt-3">Experience &amp; leadership</h2>
      <div ref={ref} className="mt-10 flex gap-6">
        <NetworkToTimeline on={seen} />
        <ul className="flex flex-1 flex-col justify-between" style={{ minHeight: 200 }}>
          {experience.map((e) => (
            <li key={e.org}>
              <p className="font-medium leading-tight">{e.org}</p>
              <p className="text-sm leading-tight text-muted">
                {e.role} · <span className="font-mono text-xs">{e.category}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
      <Link href="/experience" className="group mt-8 inline-flex min-h-11 items-center gap-2 font-medium text-accent">
        Full experience <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>
    </section>
  );
}
