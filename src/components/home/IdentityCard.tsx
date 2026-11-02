"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { profile } from "@/content/profile";
import { asset } from "@/lib/asset";

/** Flippable, pointer-tilting ID card. CSS 3D only; R3F version is a later polish pass. */
export default function IdentityCard() {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
  }
  function onLeave() {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  }

  const face = "absolute inset-0 rounded-2xl border border-line p-7 [backface-visibility:hidden]";

  return (
    <div className="mx-auto w-full max-w-sm [perspective:1200px]">
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative aspect-[5/7] transition-transform duration-200 ease-out [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        <div
          className="absolute inset-0 transition-transform duration-700 ease-in-out [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          {/* Front */}
          <button
            type="button"
            onClick={() => setFlipped(true)}
            aria-label="Flip identity card to read the introduction"
            tabIndex={flipped ? -1 : 0}
            className={`${face} flex flex-col justify-between bg-gradient-to-br from-[#16202b] to-surface text-left shadow-2xl transition-shadow hover:shadow-[0_0_40px_-10px_#42d9d1]`}
          >
            <span className="font-mono text-xs text-accent">ACCESS · IDENTITY MODULE</span>
            <span aria-hidden className="relative mx-auto block h-36 w-32 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset("/img/siddharth.jpg")} alt="" className="h-full w-full object-cover object-[50%_30%]" loading="lazy" />
              <span className="absolute inset-0 bg-gradient-to-t from-[#0e141b]/60 to-transparent mix-blend-multiply" />
            </span>
            <span>
              <span className="block text-2xl font-semibold">{profile.name}</span>
              <span className="mt-1 block text-sm text-muted">{profile.school}</span>
              <span className="block text-sm text-muted">B.S. Artificial Intelligence</span>
              <span className="mt-4 block font-mono text-[11px] tracking-widest text-muted">UCSD · B.S. 2029 · M.S. 2030</span>
            </span>
          </button>

          {/* Back */}
          <div
            className={`${face} flex flex-col justify-between bg-surface shadow-2xl`}
            style={{ transform: "rotateY(180deg)" }}
            aria-hidden={!flipped}
          >
            <p className="text-sm leading-relaxed text-muted">{profile.intro}</p>
            <div className="flex items-center justify-between">
              <Link
                href="/about"
                tabIndex={flipped ? 0 : -1}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg"
              >
                Learn More
              </Link>
              <button
                type="button"
                tabIndex={flipped ? 0 : -1}
                onClick={() => setFlipped(false)}
                className="text-sm text-muted hover:text-fg"
              >
                Flip back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
