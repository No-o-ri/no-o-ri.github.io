"use client";

/**
 * ComfyDriver cold open: a rainy night street in the same flat, ink-and-paper style as the desk.
 * A 1940s-style sedan rolls in under a streetlamp, brakes, flashes its headlights, and a case file
 * is tossed from the window toward the viewer (which wipes into the desk scene).
 * Pure SVG + CSS keyframes. `run` starts the animation; `runKey` restarts it on replay.
 */

const RAIN = (() => {
  // Deterministic rain pattern for y in [0, 480); duplicated above for a seamless loop.
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 90 }, () => ({ x: r() * 860 - 30, y: r() * 480, l: 12 + r() * 16, o: 0.12 + r() * 0.25 }));
})();

const WINDOWS: [number, number, boolean][] = [
  [52, 150, true], [74, 150, false], [52, 178, false], [74, 178, true], [52, 206, true],
  [168, 112, false], [190, 112, true], [168, 140, true], [190, 168, false], [168, 196, true],
  [612, 128, true], [636, 128, false], [612, 156, false], [636, 184, true], [612, 212, true],
  [720, 96, false], [744, 96, true], [720, 152, true], [744, 180, false],
];

/** Side-profile sedan, facing right. Local origin = ground under the rear bumper. */
function Sedan({ spin }: { spin: boolean }) {
  const wheel = (cx: number) => (
    <g transform={`translate(${cx} -22)`}>
      <circle r="21" fill="#050403" />
      <g className={spin ? "cd-roll" : undefined}>
        <circle r="13" fill="none" stroke="#d9cfb4" strokeWidth="5" />
        <circle r="7" fill="#8f826a" />
        <path d="M0 -7 V7 M-7 0 H7" stroke="#2b2622" strokeWidth="1.6" />
        <circle r="2" fill="#efe6d2" />
      </g>
    </g>
  );
  return (
    <g>
      {/* body */}
      <path
        d="M6 -28 C0 -40 4 -56 22 -60 L72 -64 C84 -92 102 -104 130 -106 L168 -106 C190 -104 204 -92 216 -70 L262 -64 C276 -62 286 -52 286 -40 L286 -28 Z"
        fill="#130d0a"
      />
      {/* moonlit rim along the roofline */}
      <path d="M22 -60 L72 -64 C84 -92 102 -104 130 -106 L168 -106 C190 -104 204 -92 216 -70 L262 -64 C276 -62 286 -52 286 -40" fill="none" stroke="#efe6d2" strokeOpacity=".32" strokeWidth="1.6" />
      {/* windows + driver in a fedora */}
      <path d="M86 -66 C95 -88 108 -97 130 -99 L150 -99 L150 -68 Z" fill="#2c2119" />
      <path d="M156 -99 L166 -99 C184 -97 196 -88 205 -70 L156 -68 Z" fill="#2c2119" />
      <path d="M90 -70 L110 -94" stroke="#efe6d2" strokeOpacity=".14" strokeWidth="5" />
      <g fill="#0a0706">
        <circle cx="178" cy="-80" r="7" />
        <path d="M168 -86 H190 L188 -89 H184 L182 -97 H174 L172 -89 H170 Z" />
        <path d="M171 -74 C170 -70 186 -70 188 -74 L190 -68 H168 Z" />
      </g>
      {/* fenders */}
      <path d="M26 -30 C28 -64 94 -68 100 -30 Z" fill="#0b0706" />
      <path d="M194 -30 C198 -66 266 -64 274 -30 Z" fill="#0b0706" />
      <path d="M30 -46 C40 -62 82 -64 96 -46" fill="none" stroke="#efe6d2" strokeOpacity=".22" strokeWidth="1.2" />
      <path d="M198 -46 C210 -62 254 -62 270 -46" fill="none" stroke="#efe6d2" strokeOpacity=".22" strokeWidth="1.2" />
      {/* trim: running board, door line, handle, bumpers */}
      <rect x="96" y="-34" width="102" height="4" rx="2" fill="#b8aa90" opacity=".55" />
      <path d="M152 -100 V-36 M108 -64 H206" stroke="#000" strokeOpacity=".5" strokeWidth="1" />
      <rect x="160" y="-60" width="10" height="2.5" rx="1" fill="#b8aa90" />
      <rect x="0" y="-34" width="14" height="5" rx="2.5" fill="#b8aa90" />
      <rect x="276" y="-34" width="16" height="5" rx="2.5" fill="#b8aa90" />
      {/* grille + lamps */}
      <path d="M278 -58 V-38" stroke="#b8aa90" strokeWidth="2" strokeDasharray="2 2" />
      <circle cx="276" cy="-52" r="5" fill="#f6e7b8" />
      <rect x="5" y="-48" width="5" height="8" rx="2" fill="#d0645c" />
      {wheel(62)}
      {wheel(232)}
    </g>
  );
}

export default function NoirStreet({ run, runKey, visible }: { run: boolean; runKey: number; visible: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 600ms ease" }}
    >
      <svg key={runKey} viewBox="0 0 800 480" preserveAspectRatio="xMidYMax slice" className={`h-full w-full ${run ? "cd-run" : ""}`}>
        <defs>
          <linearGradient id="cd-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f0b08" />
            <stop offset="1" stopColor="#2a2018" />
          </linearGradient>
          <linearGradient id="cd-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2d58c" stopOpacity=".5" />
            <stop offset="1" stopColor="#f2d58c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cd-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f6e7b8" stopOpacity=".7" />
            <stop offset="1" stopColor="#f6e7b8" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cd-pool">
            <stop offset="0" stopColor="#f2d58c" stopOpacity=".35" />
            <stop offset="1" stopColor="#f2d58c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cd-moon">
            <stop offset=".55" stopColor="#efe6d2" stopOpacity=".9" />
            <stop offset=".62" stopColor="#efe6d2" stopOpacity=".12" />
            <stop offset="1" stopColor="#efe6d2" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="480" fill="url(#cd-sky)" />
        <circle cx="690" cy="70" r="70" fill="url(#cd-moon)" />

        {/* skyline */}
        <g fill="#100b08">
          <path d="M0 340 V128 H40 V108 H96 V340 Z" />
          <path d="M96 340 V180 H128 V340 Z" />
          <path d="M150 340 V86 H212 V340 Z" />
          <path d="M212 340 V210 H262 V170 H300 V340 Z" />
          <path d="M520 340 V190 H572 V340 Z" />
          <path d="M590 340 V108 H660 V340 Z" />
          <path d="M660 340 V160 H700 V76 H770 V340 Z" />
          <path d="M770 340 V200 H800 V340 Z" />
        </g>
        <path d="M232 170 V150 M228 150 H236" stroke="#100b08" strokeWidth="3" />
        {WINDOWS.map(([x, y, lit], i) => (
          <rect key={i} x={x} y={y} width="12" height="16" fill={lit ? "#e0b252" : "#1d1611"} opacity={lit ? 0.75 : 1} className={i === 7 ? "cd-blink" : undefined} />
        ))}

        {/* sidewalk + road */}
        <rect y="340" width="800" height="14" fill="#1f1812" />
        <rect y="354" width="800" height="3" fill="#3a2f25" />
        <rect y="357" width="800" height="123" fill="#16110d" />
        <path d="M0 430 H800" stroke="#b8aa90" strokeOpacity=".22" strokeWidth="3" strokeDasharray="34 30" />

        {/* streetlamp */}
        <ellipse cx="470" cy="392" rx="190" ry="26" fill="url(#cd-pool)" />
        <path d="M454 196 L486 196 L590 392 L350 392 Z" fill="url(#cd-cone)" opacity=".55" />
        <rect x="467" y="190" width="6" height="152" fill="#0c0907" />
        <path d="M456 196 H484 L478 184 H462 Z" fill="#0c0907" />
        <rect x="462" y="196" width="16" height="4" fill="#f6e7b8" />
        <rect x="462" y="336" width="16" height="6" fill="#0c0907" />
        {/* reflections on the wet road */}
        <rect x="466" y="398" width="8" height="70" fill="#f2d58c" opacity=".14" />
        <rect x="56" y="372" width="4" height="40" fill="#e0b252" opacity=".1" />
        <rect x="190" y="366" width="4" height="56" fill="#e0b252" opacity=".1" />
        <rect x="614" y="370" width="4" height="48" fill="#e0b252" opacity=".1" />

        {/* the car: drive > brake dip > bob */}
        <g transform="translate(255 392)">
          <g className="cd-drive">
            {/* headlight beam */}
            <path d="M282 -52 L620 -110 L620 20 Z" fill="url(#cd-beam)" className="cd-beam" />
            <ellipse cx="144" cy="2" rx="150" ry="7" fill="#000" opacity=".55" />
            {/* reflection */}
            <g transform="scale(1 -1)" opacity=".1"><Sedan spin={run} /></g>
            <g className="cd-dip">
              <g className="cd-bob"><Sedan spin={run} /></g>
            </g>
            {/* exhaust */}
            {[0, 1, 2].map((i) => (
              <circle key={i} cx="-4" cy="-30" r="6" fill="#b8aa90" className="cd-puff" style={{ animationDelay: `${0.2 + i * 0.32}s` }} />
            ))}
          </g>
          {/* case file tossed from the window toward the viewer */}
          <g transform="translate(180 -82)">
            <g className="cd-toss">
              <path d="M-30 -18 h18 l4 -5 h38 v42 h-60 z" fill="#b99b63" />
              <rect x="-30" y="-14" width="60" height="38" rx="1.5" fill="#c9ab72" />
              <rect x="-24" y="2" width="34" height="2.5" fill="#3a2d1a" opacity=".7" />
              <rect x="-24" y="8" width="24" height="2" fill="#3a2d1a" opacity=".45" />
              <rect x="14" y="-10" width="12" height="7" fill="#8a2b2b" opacity=".8" />
            </g>
          </g>
        </g>

        {/* rain */}
        <g className="cd-rain" stroke="#d9cfb4">
          {[0, -480].map((dy) =>
            RAIN.map((d, i) => <line key={`${dy}-${i}`} x1={d.x} y1={d.y + dy} x2={d.x - 5} y2={d.y + dy + d.l} strokeOpacity={d.o} strokeWidth="1" />),
          )}
        </g>

        <text x="24" y="34" fontFamily="var(--font-mono-stack)" fontSize="12" letterSpacing="2.5" fill="#efe6d2" className="cd-title">
          11:52 PM · SOMEWHERE OFF THE HIGHWAY
        </text>

        <style>{`
          .cd-rain { animation: cd-rain .5s linear infinite; }
          .cd-blink { animation: cd-blink 4s steps(1) infinite; }
          .cd-title { opacity: 0; }
          .cd-puff, .cd-toss { opacity: 0; transform-box: fill-box; transform-origin: center; }
          .cd-roll { transform-box: fill-box; transform-origin: center; }
          .cd-dip { transform-box: fill-box; transform-origin: 85% 100%; }

          .cd-run .cd-title { animation: cd-fade 900ms ease 300ms both; }
          .cd-run .cd-drive { animation: cd-drive 2000ms cubic-bezier(.2,.6,.25,1) 200ms both; }
          .cd-run .cd-roll  { animation: cd-roll 2000ms cubic-bezier(.2,.6,.25,1) 200ms both; }
          .cd-run .cd-bob   { animation: cd-bob 260ms ease-in-out 200ms 7; }
          .cd-run .cd-dip   { animation: cd-dip 520ms ease-out 2150ms both; }
          .cd-run .cd-beam  { animation: cd-flash 650ms linear 2400ms both; }
          .cd-run .cd-puff  { animation: cd-puff 900ms ease-out 3 both; }
          .cd-run .cd-toss  { animation: cd-toss 820ms cubic-bezier(.5,0,.7,.4) 2650ms both; }

          @keyframes cd-rain  { from { transform: translateY(0) } to { transform: translateY(480px) } }
          @keyframes cd-blink { 0%, 62% { opacity: .75 } 63%, 100% { opacity: .05 } }
          @keyframes cd-fade  { from { opacity: 0; transform: translateY(4px) } to { opacity: .8; transform: none } }
          @keyframes cd-drive { from { transform: translateX(-640px) } to { transform: translateX(0) } }
          @keyframes cd-roll  { from { transform: rotate(-1750deg) } to { transform: rotate(0deg) } }
          @keyframes cd-bob   { 50% { transform: translateY(-1.6px) } }
          @keyframes cd-dip   { 30% { transform: rotate(1.8deg) } 100% { transform: rotate(0) } }
          @keyframes cd-flash { 0% { opacity: 1 } 12% { opacity: .1 } 24% { opacity: 1 } 36% { opacity: .1 } 55%, 100% { opacity: 1 } }
          @keyframes cd-puff  { 0% { opacity: .35; transform: translate(0,0) scale(.4) } 100% { opacity: 0; transform: translate(-40px,-14px) scale(2.2) } }
          @keyframes cd-toss  {
            0%   { opacity: 0; transform: translate(0,0) scale(.25) rotate(0deg) }
            10%  { opacity: 1 }
            55%  { transform: translate(-40px,-110px) scale(1.8) rotate(-22deg) }
            100% { opacity: 1; transform: translate(-60px,-120px) scale(14) rotate(-6deg) }
          }
        `}</style>
      </svg>
    </div>
  );
}
