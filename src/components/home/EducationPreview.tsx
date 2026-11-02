import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { education as edu } from "@/content/education";
import PixelTrident from "./PixelTrident";

export default function EducationPreview() {
  return (
    <section aria-labelledby="edu-heading" className="container-x">
      <p className="eyebrow">Education</p>
      <h2 id="edu-heading" className="h2 mt-3">{edu.university.name}</h2>
      <div className="mt-10 grid items-center gap-10 md:grid-cols-[auto_1fr]">
        <PixelTrident className="h-48 w-48 md:h-56 md:w-56" />
        <div className="space-y-2">
          <p>{edu.university.college}</p>
          <p className="text-muted">{edu.university.track}</p>
          <p className="text-muted">{edu.university.graduation}</p>
          <p className="text-muted">{edu.university.masters}</p>
          <p className="pt-4 text-sm text-muted">
            Previously <span className="text-fg">{edu.highSchool.name}</span>, {edu.highSchool.graduation}
          </p>
          <Link href="/education" className="group mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-accent">
            Full education <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
