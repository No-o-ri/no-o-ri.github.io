"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { projects } from "@/content/projects";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import ProjectPreview from "./ProjectPreviews";

/** The pulse reaches a hub and splits into four outputs, one per project. */
function BranchHub() {
  const [ref, seen] = useInViewOnce<SVGSVGElement>(0.5);
  const xs = [60, 180, 300, 420];
  return (
    <svg ref={ref} aria-hidden viewBox="0 0 480 90" className="mx-auto mt-10 h-20 w-full max-w-xl" fill="none">
      <path d="M240 0 V30" stroke="#26313d" strokeWidth="2" />
      {xs.map((x, i) => {
        const d = `M240 30 H${x} V90`;
        return (
          <g key={x}>
            <path d={d} stroke="#26313d" strokeWidth="2" />
            <path
              d={d} stroke="#42d9d1" strokeWidth="2" pathLength={100} strokeDasharray="100"
              strokeDashoffset={seen ? 0 : 100}
              style={{ transition: `stroke-dashoffset .9s ease ${0.2 + i * 0.25}s` }}
            />
          </g>
        );
      })}
      <circle cx="240" cy="30" r="5" fill="#111720" stroke="#42d9d1" strokeWidth="2" />
    </svg>
  );
}

function Card({ i }: { i: number }) {
  const p = projects[i];
  const [ref, seen] = useInViewOnce<HTMLLIElement>(0.35);
  const num = String(i + 1).padStart(2, "0");

  // A soft light follows the cursor across the card; the preview tilts toward it.
  function onMove(e: React.PointerEvent<HTMLLIElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty("--mx", `${x * 100}%`);
    e.currentTarget.style.setProperty("--my", `${y * 100}%`);
    e.currentTarget.style.setProperty("--tx", `${((y - 0.5) * -6).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--ty", `${((x - 0.5) * 8).toFixed(2)}deg`);
  }
  function onLeave(e: React.PointerEvent<HTMLLIElement>) {
    e.currentTarget.style.setProperty("--tx", "0deg");
    e.currentTarget.style.setProperty("--ty", "0deg");
  }

  return (
    <li
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`group/card relative grid gap-6 overflow-hidden rounded-2xl border bg-surface p-6 transition-colors duration-700 md:grid-cols-2 md:items-center md:gap-12 md:p-10 ${
        seen ? "border-accent/40" : "border-line"
      } ${i % 2 ? "md:[&>div:nth-child(3)]:order-2" : ""}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
        style={{ background: "radial-gradient(520px circle at var(--mx,50%) var(--my,50%), rgba(66,217,209,.10), transparent 45%)" }}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-6 select-none font-mono text-[9rem] font-bold leading-none text-transparent [-webkit-text-stroke:1px_var(--line)] md:text-[12rem] ${i % 2 ? "left-4" : "right-4"}`}
      >
        {num}
      </span>
      <div className="[perspective:1000px]">
        <div
          className="aspect-[16/10] overflow-hidden rounded-xl border border-line shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)] transition-transform duration-300 ease-out [transform:rotateX(var(--tx,0deg))_rotateY(var(--ty,0deg))]"
          role="img"
          aria-label={`${p.title} animated preview`}
        >
          <ProjectPreview slug={p.slug} on={seen} />
        </div>
      </div>

      <div className="relative">
        <p className="font-mono text-xs text-muted"><span className="text-accent">{num}</span> / {String(projects.length).padStart(2, "0")} · {p.category}</p>
        <h3 className="mt-2 text-2xl font-semibold md:text-3xl">{p.title}</h3>
        <p className="mt-3 text-lg font-medium text-accent">{p.highlight}</p>
        <p className="mt-3 text-sm text-muted">{p.summary}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {p.technologies.map((t) => (
            <li key={t} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">{t}</li>
          ))}
        </ul>
        <Link href={`/projects/${p.slug}`} className="group mt-6 inline-flex min-h-11 items-center gap-2 font-medium text-accent">
          Explore Project
          <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

export default function FeaturedProjects() {
  return (
    <section id="work" aria-labelledby="featured-heading" className="container-x scroll-mt-24">
      <p className="eyebrow">Selected work</p>
      <h2 id="featured-heading" className="h2 mt-3">Projects</h2>
      <BranchHub />
      <ul className="mt-6 space-y-8">
        {projects.map((_, i) => <Card key={projects[i].slug} i={i} />)}
      </ul>
    </section>
  );
}
