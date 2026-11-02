import Link from "next/link";
import { navLinks, profile } from "@/content/profile";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="group relative mt-32 border-t border-line">
      {/* Circuit pulse that travels the border on hover (CSS only). */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-px overflow-hidden">
        <span
          className="block h-px w-1/4 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100"
          style={{ animation: "footer-pulse 2.2s linear infinite" }}
        />
      </span>

      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-mono text-lg font-semibold">
            SN<span className="text-accent">.</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-muted">{profile.tagline}</p>
        </div>

        <div>
          <h2 className="eyebrow">Navigate</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted transition-colors hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow">Contact</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={`mailto:${profile.email}`} className="text-muted transition-colors hover:text-fg">
                {profile.email}
              </a>
            </li>
            {profile.githubUrl && (
              <li>
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-fg">
                  GitHub
                </a>
              </li>
            )}
            {profile.linkedinUrl && (
              <li>
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-fg">
                  LinkedIn
                </a>
              </li>
            )}
            <li>
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-fg">
                Resume
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="container-x py-5 text-xs text-muted">
          © {year} {profile.name}
        </p>
      </div>
    </footer>
  );
}
