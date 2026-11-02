import { profile } from "@/content/profile";

const ITEMS = Object.values(profile.skills).flat();

/** Slow, endless strip of the stack. Duplicated once so the -50% loop is seamless. */
export default function TechMarquee() {
  return (
    <div aria-label="Tools and technologies" role="list" className="group relative overflow-hidden border-y border-line bg-surface/40 py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className="flex w-max gap-10 font-mono text-sm uppercase tracking-[0.16em] text-muted [animation:marquee_48s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex gap-10">
            {ITEMS.map((t) => (
              <span key={t} role={copy === 0 ? "listitem" : undefined} className="flex items-center gap-10 whitespace-nowrap">
                {t}
                <span aria-hidden className="h-1 w-1 rotate-45 bg-accent" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
