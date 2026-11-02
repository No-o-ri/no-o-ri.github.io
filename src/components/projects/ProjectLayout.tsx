import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { projects, type Project } from "@/content/projects";
import PageHeader from "@/components/ui/PageHeader";
import { profile } from "@/content/profile";

const isTodo = (s: string) => s.includes("[TODO");

function Item({ text }: { text: string }) {
  return <li className={isTodo(text) ? "placeholder-note" : "text-muted"}>{text}</li>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10 md:grid md:grid-cols-[14rem_1fr] md:gap-10">
      <h2 className="eyebrow mb-4 md:mb-0">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

/**
 * Shared case-study hierarchy from PRD §5.
 * `intro` is the project's signature scene; `demo` is an optional extra interactive/accessible block.
 * `themeVars` re-skins the page body only; the global navbar and footer stay recognizable.
 */
export default function ProjectLayout({
  project,
  intro,
  demo,
  demoTitle = "Interactive demo",
  themeVars,
}: {
  project: Project;
  intro?: React.ReactNode;
  demo?: React.ReactNode;
  demoTitle?: string;
  themeVars?: Record<string, string>;
}) {
  const i = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(i + 1) % projects.length];

  return (
    <article className="bg-bg text-fg" style={themeVars as React.CSSProperties}>
      <PageHeader eyebrow={project.category} title={project.title} lead={project.subtitle} />

      <div className="container-x">
        {intro ?? (
          <div
            role="img"
            aria-label={`${project.title} introductory scene placeholder`}
            className="grid h-64 place-items-center rounded-2xl border border-line bg-surface md:h-96"
          >
            <p className="font-mono text-sm text-muted">{project.theme.label} scene</p>
          </div>
        )}

        <div className="mt-12">
          <Section title="Problem">
            <p className={isTodo(project.problem) ? "placeholder-note" : "text-lg"}>{project.problem}</p>
          </Section>
          <Section title="Overview">
            <p className={isTodo(project.summary) ? "placeholder-note" : "text-muted"}>{project.summary}</p>
          </Section>
          {demo && <Section title={demoTitle}>{demo}</Section>}
          <Section title="Approach">
            <ul className="list-disc space-y-2 pl-5 marker:text-accent">
              {project.approach.map((a) => <Item key={a} text={a} />)}
            </ul>
          </Section>
          <Section title="Technologies">
            <ul className="flex flex-wrap gap-2">
              {project.technologies.map((t) => (
                <li key={t} className={`rounded-full border border-line px-3 py-1 font-mono text-xs ${isTodo(t) ? "text-[#e0b252]" : "text-muted"}`}>
                  {t}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Challenges">
            <ul className="list-disc space-y-2 pl-5 marker:text-accent">
              {project.challenges.map((c) => <Item key={c} text={c} />)}
            </ul>
          </Section>
          <Section title="Results / status">
            <ul className="space-y-2">
              {project.outcomes.map((o) => <Item key={o} text={o} />)}
              {project.status && <Item text={`Status: ${project.status}`} />}
            </ul>
          </Section>
          {project.media.length > 0 && (
            <Section title="Supporting media">
              <ul className="grid gap-4 sm:grid-cols-2">
                {project.media.map((m) => <li key={m} className="text-muted">{m}</li>)}
              </ul>
            </Section>
          )}
          <Section title="Links">
            <ul className="flex flex-wrap gap-4">
              {project.githubUrl && (
                <li><a className="inline-flex items-center gap-1 text-accent" href={project.githubUrl} target="_blank" rel="noopener noreferrer">Repository <ExternalLink size={14} aria-hidden /></a></li>
              )}
              {project.demoUrl && (
                <li><a className="inline-flex items-center gap-1 text-accent" href={project.demoUrl} target="_blank" rel="noopener noreferrer">Live demo <ExternalLink size={14} aria-hidden /></a></li>
              )}
              <li><a className="inline-flex items-center gap-1 text-accent" href={profile.githubUrl} target="_blank" rel="noopener noreferrer">More on GitHub <ExternalLink size={14} aria-hidden /></a></li>
              <li><a className="inline-flex items-center gap-1 text-accent" href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">Resume <ExternalLink size={14} aria-hidden /></a></li>
            </ul>
          </Section>
        </div>

        <nav aria-label="Next project" className="mt-12 border-t border-line pt-10 pb-4">
          <Link
            href={`/projects/${next.slug}`}
            className="group inline-flex items-center gap-3 text-2xl font-semibold transition-colors hover:text-accent"
          >
            <span>
              <span className="eyebrow block">Next project</span>
              {next.title}
            </span>
            <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </Link>
        </nav>
      </div>
    </article>
  );
}
