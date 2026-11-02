"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X, Bot, Network, Cpu, Wrench } from "lucide-react";
import { navLinks, profile } from "@/content/profile";
import { projects } from "@/content/projects";

const icons: Record<string, typeof Bot> = {
  comfydriver: Bot,
  duckiebot: Cpu,
  linxicon: Network,
  "court-part-maintenance": Wrench,
};

const descriptors: Record<string, string> = {
  comfydriver: "Language → routing preferences",
  duckiebot: "Autonomous lane following",
  linxicon: "Language as a network",
  "court-part-maintenance": "Maintenance diagnostics",
};

export default function Navbar() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [mobileProjects, setMobileProjects] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation.
  useEffect(() => {
    setProjectsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close dropdown on outside click / Escape.
  useEffect(() => {
    if (!projectsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setProjectsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProjectsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [projectsOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const inProjects = pathname.startsWith("/projects");

  const linkCls = (active: boolean) =>
    `relative px-3 py-2 text-sm transition-colors duration-200 ${
      active ? "text-fg" : "text-muted hover:text-fg"
    }`;

  const first = navLinks.slice(0, 2); // Home, About
  const rest = navLinks.slice(2); // Education, Experience

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 border-b ${
        scrolled || mobileOpen
          ? "border-line bg-bg/75 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <nav aria-label="Primary" className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="font-mono text-lg font-semibold tracking-tight" aria-label="Siddharth Nori — home">
          SN<span className="text-accent">.</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {first.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={linkCls(isActive(l.href))}>
              {l.label}
              {isActive(l.href) && <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent" />}
            </Link>
          ))}

          <div
            ref={menuRef}
            className="relative"
            onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setProjectsOpen(true)}
            onMouseLeave={() => window.matchMedia("(hover: hover)").matches && setProjectsOpen(false)}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={projectsOpen}
              aria-controls="projects-menu"
              onClick={() => setProjectsOpen((o) => !o)}
              className={`${linkCls(inProjects)} inline-flex items-center gap-1`}
            >
              Projects
              <ChevronDown size={14} className={`transition-transform duration-200 ${projectsOpen ? "rotate-180" : ""}`} aria-hidden />
              {inProjects && <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent" />}
            </button>

            <div
              id="projects-menu"
              role="menu"
              hidden={!projectsOpen}
              className="absolute left-1/2 top-full w-[22rem] -translate-x-1/2 pt-2"
            >
              <ul className="overflow-hidden rounded-xl border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur-md">
                {projects.map((p) => {
                  const Icon = icons[p.slug] ?? Cpu;
                  return (
                    <li key={p.slug} role="none">
                      <Link
                        role="menuitem"
                        href={`/projects/${p.slug}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-white/5 focus-visible:bg-white/5"
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line"
                          style={{ color: p.theme.accent }}
                        >
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-fg">{p.title}</span>
                          <span className="block truncate text-xs text-muted">{descriptors[p.slug]}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {rest.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={linkCls(isActive(l.href))}>
              {l.label}
              {isActive(l.href) && <span className="absolute inset-x-3 -bottom-0.5 h-px bg-accent" />}
            </Link>
          ))}

          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            Resume <ArrowUpRight size={14} aria-hidden />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-md md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div id="mobile-menu" hidden={!mobileOpen} className="border-t border-line bg-bg/95 md:hidden">
        <ul className="container-x max-h-[calc(100dvh-4rem)] overflow-y-auto py-3">
          {first.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block py-3 text-base" aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="flex w-full items-center justify-between py-3 text-base"
              aria-expanded={mobileProjects}
              aria-controls="mobile-projects"
              onClick={() => setMobileProjects((o) => !o)}
            >
              Projects
              <ChevronDown size={18} className={`transition-transform duration-200 ${mobileProjects ? "rotate-180" : ""}`} aria-hidden />
            </button>
            <ul id="mobile-projects" hidden={!mobileProjects} className="mb-2 ml-1 border-l border-line pl-4">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/projects/${p.slug}`} className="block py-2.5 text-sm text-muted hover:text-fg">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          {rest.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block py-3 text-base" aria-current={isActive(l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 py-3 text-base text-accent">
              Resume <ArrowUpRight size={16} aria-hidden />
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
