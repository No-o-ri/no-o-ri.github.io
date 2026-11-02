# Portfolio: status, notes, and open questions

Stack: static Next.js (`output: 'export'`), Tailwind v4, Motion, React Three Fiber + drei + three, Lucide. Deployed to GitHub Pages via `.github/workflows/deploy.yml`.
No GSAP: Motion, CSS and R3F covered everything, and the PRD says not to add libraries without a concrete need.

## Run it
```
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to out/
```
Quality override for testing: add `?quality=high`, `?quality=low` or `?quality=none` to any URL
(high = full 3D, low = touch/weak-device behaviour, none = no-WebGL / reduced-motion fallbacks).

Deploy notes: project repo (`user.github.io/repo`) needs `NEXT_PUBLIC_BASE_PATH=/repo` in the workflow; `user.github.io` or a custom domain needs nothing.

## Status
| Phase | State |
|---|---|
| 1 Foundation | Done |
| 2 Landing | Done (needs visual check) |
| 3 Project worlds | Done (needs visual check) |
| 4 About + Education | Done (needs visual check) |
| 5 Polish | Not started: tests, SEO (sitemap/OG/structured data), perf profiling, cross-browser |

**Not yet seen in a real browser.** The code typechecks, builds, and the Duckiebot steering law was verified numerically, but 3D scenes were never rendered here. Expect to tune lighting, camera framing and timings after a first look.

### What exists
- **Home:** WebGL motherboard (procedural PCB, shader-lit traces, pulse + chasing camera, chip arrival, name reveal in HTML, Skip, plays once per session). SVG version on touch/weak/no-WebGL/reduced motion. Scroll-driven pulse connectors, branch hub, animated previews per project, pixel-trident formation, network-to-timeline experience preview, flippable tilting ID card.
- **ComfyDriver:** DOM case-file sequence (folder, unfold, extraction lines, paper becomes JSON editor), plus a deterministic "preference interpretation" demo labelled illustrative.
- **Duckiebot:** R3F stylized robot assembly, power-on, switch to first-person, simulated lane following (pure pursuit), CV overlay toggle, first/third person, pause, slow-mo, reset, simulated HUD. 2D fallback.
- **Linxicon:** R3F word graph (isolated words, springy bond formation, pull-back, orbit), select/neighbor highlight, search, labels, zoom/rotate buttons, reset, and a searchable accessible table. Uses a hand-written example dataset.
- **Court Part Maintenance:** R3F blueprint drafting, wireframe-to-solid, exploded view with guide lines, part selection with panel, explode/assemble, blueprint/realistic, rotate, reset. Generic assembly and sample data.
- **About:** R3F card-to-USB transformation, insertion into a computer, boot screen, then HTML profile with accessible tabs and the DO_NOT_OPEN easter egg.
- **Education:** R3F sculptural trident (blue/gold light, camera climb and pull-back, parallax), static animated vector on mobile; academic sections with expandable award cards.

### Realism pass (v2)
- Hero motherboard and Education trident rebuilt with PBR materials, detailed geometry, shadows/AO, depth of field, bloom and ACES tone mapping (`@react-three/postprocessing`). High-quality tier only; SVG/2D fallbacks unchanged.
- Duckiebot rebuilt: detailed robot (treaded tyres, spoked hubs, motors, Jetson-style board with finned heatsink, camera module, bumper, rubber duck), hover-stage intro (parts snap together, platform opens, robot drops onto the field), fixed the first-person lens blocking the view.
- ComfyDriver: new "Call the driver" scripted phone call (opt-in audio: browser text-to-speech + original generative noir track "Midnight Detour" synthesised with Web Audio, live captions, JSON fills in, route map bends to the scenic road). Illustrative script, labelled as such.
- About intro rebuilt (glossy extruded ID card with chip + foil, anodised USB drive with a real plug, aluminium mini PC with a hollow USB-A port, thin-bezel monitor, keyboard, mouse, mug, desk mat; shadows/AO/bloom).
- About profile: liquid "helmet portrait" (`HelmetPortrait.tsx`, photo at `public/img/siddharth.jpg`): a metaball liquid follows the cursor and reveals parts of an original circuit-livery helmet, edged with a teal rim; it drains when you leave. Auto-demo swipe on first view, touch drag supported, "Show full helmet" button. Reduced motion shows the helmet statically.
- Court Part and Linxicon scenes still use the earlier stylized geometry and are next.

### Amp-up pass (v3, needs visual check)
- Hero: cursor-following inspection spotlight with real shadows (wanders when idle), idle data pulses leaving the CPU, dust motes lit by the lamp, pointer parallax, breathing die glow, scroll-to-dive camera onto the chip, name decodes in (two-line, outlined surname), live telemetry strip + scroll cue, text fades/lifts on scroll.
- Site-wide film grain (`.grain` in globals.css). Project cards: cursor spotlight, tilting preview, oversized outline numerals.
- ComfyDriver: `NoirStreet.tsx` cold open (rainy street, 1940s sedan drives in, brakes, flashes lights, tosses the case file at the camera, which lands on the desk).

### Simplified or deferred (documented per PRD rule 12)
- Motherboard has no tiny component labels (would need text sprites; skipped for cost).
- Card state is not carried from the homepage to `/about`; About starts with a standalone card animation.
- Education trident does not morph through pixel art (the homepage preview does).
- Duckiebot uses a stylized robot, not the real DB21J model.
- Experience page has no scroll-driven signal yet (P1).
- Mobile gets 2D or simplified scenes and a "Tap to interact" gate on interactive canvases so scrolling never gets trapped.
- No automated tests yet, no sitemap/OG images/structured data, no performance measurements.

## Content (v3)
All copy now comes from the resume (`resume_Siddharth_Nori_AIML_UCSD - Copy.docx`, exported to `public/resume/Siddharth_Nori_Resume.pdf`). GitHub: github.com/no-o-ri; LinkedIn from the resume. No [TODO] placeholders remain on any page.

## Still open
- **Court Part Maintenance page:** the 3D demo is a generic mechanical assembly, which doesn't match the real tool (court part records for the Kings County DA's Office). Needs a new scene.
- Per-project repo / demo links (pages currently link to the GitHub profile).
- Dates for NJCCIC, Garden State CTF, CS Club; Asha for Education was dropped (not on the resume).

## Next (Phase 5)
Fix whatever the first visual pass shows, then Vitest + Playwright smoke tests, sitemap/robots/OG/structured data (needs the final domain), Lighthouse and frame-rate profiling, accessibility audit, Safari/Firefox checks.
