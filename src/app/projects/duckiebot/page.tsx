import type { Metadata } from "next";
import { getProject } from "@/content/projects";
import ProjectLayout from "@/components/projects/ProjectLayout";
import DuckiebotExperience from "@/components/projects/DuckiebotExperience";

const project = getProject("duckiebot")!;

export const metadata: Metadata = { title: project.title, description: project.subtitle };

// Robotics lab: matte black, graphite, industrial yellow, cool white, technical blue.
const theme = {
  "--bg": "#0b0c0e",
  "--surface": "#14161a",
  "--fg": "#eef2f6",
  "--muted": "#a3acb8",
  "--accent": "#f5c400",
  "--accent-2": "#5aa7ff",
  "--line": "#2a2d33",
};

export default function Page() {
  return <ProjectLayout project={project} themeVars={theme} intro={<DuckiebotExperience />} />;
}
