import type { Metadata } from "next";
import { getProject } from "@/content/projects";
import ProjectLayout from "@/components/projects/ProjectLayout";
import LinxiconExperience from "@/components/projects/LinxiconExperience";

const project = getProject("linxicon")!;

export const metadata: Metadata = { title: project.title, description: project.subtitle };

// Deep midnight blue, violet, soft cyan, white, muted gold.
const theme = {
  "--bg": "#070a1f",
  "--surface": "#0d1230",
  "--fg": "#f2f4ff",
  "--muted": "#a8afd0",
  "--accent": "#7be3f2",
  "--accent-2": "#8b7bff",
  "--line": "#232a5a",
};

export default function Page() {
  return <ProjectLayout project={project} themeVars={theme} intro={<LinxiconExperience />} />;
}
