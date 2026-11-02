import type { Metadata } from "next";
import { getProject } from "@/content/projects";
import ProjectLayout from "@/components/projects/ProjectLayout";
import ComfyDriverScene from "@/components/scenes/ComfyDriverScene";
import PreferenceDemo from "@/components/projects/PreferenceDemo";
import DriverCall from "@/components/projects/DriverCall";

const project = getProject("comfydriver")!;

export const metadata: Metadata = { title: project.title, description: project.subtitle };

// Detective desk: dark walnut page body with ivory paper and muted red accents (keeps the global navbar legible).
const theme = {
  "--bg": "#14100d",
  "--surface": "#1d1712",
  "--fg": "#efe6d2",
  "--muted": "#b8aa90",
  "--accent": "#d0645c",
  "--line": "#3a2f25",
};

export default function Page() {
  return <ProjectLayout project={project} themeVars={theme} intro={<ComfyDriverScene />} demo={<div className="space-y-8"><DriverCall /><PreferenceDemo /></div>} demoTitle="Call the driver and preference demo" />;
}
