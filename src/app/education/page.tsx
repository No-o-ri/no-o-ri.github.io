import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import TridentHero from "@/components/education/TridentHero";
import { education as edu } from "@/content/education";

export const metadata: Metadata = {
  title: "Education",
  description: "Academic background at UC San Diego and South Brunswick High School.",
};

export default function EducationPage() {
  return (
    <>
      <PageHeader eyebrow="Education" title="Academics" lead="UC San Diego and South Brunswick High School." />
      <div className="container-x">
        <TridentHero />
      </div>

      <div className="container-x mt-12 space-y-6">
        <section aria-labelledby="ucsd" className="rounded-2xl border border-line bg-surface p-8">
          <h2 id="ucsd" className="text-2xl font-semibold">{edu.university.name}</h2>
          <p className="mt-1 text-muted">{edu.university.college}</p>
          <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-3">
            <div><dt className="eyebrow">Degree</dt><dd className="mt-1">{edu.university.track}</dd></div>
            <div><dt className="eyebrow">Graduation</dt><dd className="mt-1">{edu.university.graduation}<br />{edu.university.masters}</dd></div>
            <div><dt className="eyebrow">Coursework</dt><dd className="mt-1">{edu.university.coursework.join(", ")}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="sbhs" className="rounded-2xl border border-line bg-surface p-8">
          <h2 id="sbhs" className="text-2xl font-semibold">{edu.highSchool.name}</h2>
          <p className="mt-1 text-muted">{edu.highSchool.graduation}</p>
          <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-[auto_1fr]">
            <div>
              <dt className="eyebrow">GPA</dt>
              <dd className="mt-1 text-4xl font-semibold tabular-nums">{edu.highSchool.gpa.split(" ")[0]}<span className="ml-2 text-sm font-normal text-muted">weighted</span></dd>
            </div>
            <div>
              <dt className="eyebrow">Relevant coursework</dt>
              <dd className="mt-1">{edu.highSchool.coursework.join(" · ")}</dd>
            </div>
          </dl>
          <h3 className="eyebrow mt-8">AP exams</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {edu.highSchool.apScores.map((a) => (
              <li key={a.course} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 text-sm">
                <span>{a.course}</span>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md font-mono font-semibold ${a.score === 5 ? "bg-accent text-bg" : "border border-accent text-accent"}`}>{a.score}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="honors" className="rounded-2xl border border-line bg-surface p-8">
          <h2 id="honors" className="text-2xl font-semibold">Honors and awards</h2>
          <ol className="mt-6 space-y-3 border-l border-line pl-6">
            {edu.honors.map((h) => (
              <li key={h.title} className="relative">
                <span aria-hidden className="absolute -left-[1.85rem] top-2 h-2 w-2 rounded-full bg-accent" />
                <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-5 py-3">
                  <span className="font-medium">{h.title}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{h.category}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
