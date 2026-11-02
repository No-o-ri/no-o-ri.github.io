import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import AboutExperience from "@/components/about/AboutExperience";
import { profile } from "@/content/profile";

export const metadata: Metadata = { title: "About", description: profile.intro };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="Hi, I'm Siddharth." lead="Plug in to load the profile." />
      <div className="container-x">
        <AboutExperience />
      </div>
    </>
  );
}
