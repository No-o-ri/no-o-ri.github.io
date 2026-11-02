import type { Metadata } from "next";
import { getProject } from "@/content/projects";
import ProjectLayout from "@/components/projects/ProjectLayout";
import MaintenanceExperience from "@/components/projects/MaintenanceExperience";

const project = getProject("court-part-maintenance")!;

export const metadata: Metadata = { title: project.title, description: project.subtitle };

// Blueprint navy, cyan technical lines, white, brushed steel, safety orange.
const theme = {
  "--bg": "#071a33",
  "--surface": "#0b2447",
  "--fg": "#f4f8fc",
  "--muted": "#a9bdd2",
  "--accent": "#39c4d8",
  "--accent-2": "#ff7a1a",
  "--line": "#1c3d69",
};

export default function Page() {
  return <ProjectLayout project={project} themeVars={theme} intro={<MaintenanceExperience />} />;
}
