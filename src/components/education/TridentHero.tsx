"use client";

import { VectorTrident } from "@/components/home/PixelTrident";

/** Monument hero: the UC San Diego trident, glowing and gently floating. */
export default function TridentHero() {
  return (
    <div className="relative h-[70svh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-line bg-[#04060a]">
      <div className="absolute inset-0 grid place-items-center" role="img" aria-label="The UC San Diego trident">
        <div aria-hidden className="absolute h-80 w-80 rounded-full bg-[#1c3a7a]/40 blur-3xl" />
        <VectorTrident className="relative h-[80%] max-h-[500px] w-auto motion-safe:animate-[trident-float_7s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes trident-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }`}</style>
    </div>
  );
}
