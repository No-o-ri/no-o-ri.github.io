import CircuitHero from "@/components/home/CircuitHero";
import IdentityCard from "@/components/home/IdentityCard";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import EducationPreview from "@/components/home/EducationPreview";
import ExperiencePreview from "@/components/home/ExperiencePreview";
import PulseConnector from "@/components/home/PulseConnector";
import TechMarquee from "@/components/home/TechMarquee";
import ImpactStrip from "@/components/home/ImpactStrip";

export default function Home() {
  return (
    <>
      <CircuitHero />
      <TechMarquee />
      <div className="h-10" />
      <ImpactStrip />
      <PulseConnector />
      <section id="about-preview" aria-label="About preview" className="container-x scroll-mt-24 py-12">
        <IdentityCard />
      </section>
      <PulseConnector />
      <FeaturedProjects />
      <PulseConnector />
      <EducationPreview />
      <PulseConnector />
      <ExperiencePreview />
    </>
  );
}
