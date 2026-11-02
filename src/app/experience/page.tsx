import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import { experience, experienceCategories } from "@/content/experience";

export const metadata: Metadata = {
  title: "Experience",
  description: "Professional, research, and leadership experience.",
};

export default function ExperiencePage() {
  return (
    <>
      <PageHeader eyebrow="Experience" title="Experience & leadership" lead="Published research, cybersecurity work, and a hackathon that reached 30+ countries." />
      <div className="container-x space-y-14">
        {experienceCategories.map((cat) => {
          const items = experience.filter((e) => e.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="eyebrow mb-5">{cat}</h2>
              <ul className="space-y-4 border-l border-line pl-6">
                {items.map((e) => (
                  <li key={e.org} className="relative">
                    <span aria-hidden className="absolute -left-[1.85rem] top-2 h-2 w-2 rounded-full bg-accent" />
                    <details open className="group rounded-xl border border-line bg-surface p-5">
                      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2">
                        <span>
                          <span className="block text-lg font-semibold">{e.org}</span>
                          <span className="block text-sm text-muted">{e.role}</span>
                        </span>
                        {e.dates && <span className="font-mono text-xs text-accent">{e.dates}</span>}
                      </summary>
                      <div className="mt-4 space-y-3 text-sm">
                        <p className="text-muted">{e.description}</p>
                        <ul className="list-disc space-y-1 pl-5 marker:text-accent">
                          {e.responsibilities.map((r) => <li key={r} className="text-fg/85">{r}</li>)}
                        </ul>
                        <ul className="flex flex-wrap gap-2">
                          {e.skills.map((s) => <li key={s} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">{s}</li>)}
                        </ul>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
