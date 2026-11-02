// Project metadata. Facts come from the resume; nothing beyond it is claimed.

export type Project = {
  slug: string;
  title: string;
  /** One-line hook shown on the homepage card. */
  highlight: string;
  category: string;
  subtitle: string;
  summary: string;
  problem: string;
  approach: string[];
  technologies: string[];
  challenges: string[];
  outcomes: string[];
  status?: string;
  githubUrl?: string;
  demoUrl?: string;
  media: string[];
  theme: { accent: string; label: string };
};export const projects: Project[] = [
  {
    slug: "comfydriver",
    title: "ComfyDriver",
    highlight: "Local LLMs turn \"scenic, no highways\" into route parameters",
    category: "AI · Local LLMs · Structured output",
    subtitle: "Turning natural-language driving preferences into machine-readable routing parameters.",
    summary:
      "ComfyDriver takes how a driver actually talks about a trip and converts it into structured JSON parameters that a downstream route-selection system can use, running entirely on local models through Ollama.",
    problem:
      "Drivers describe what they want loosely (\"scenic but not too slow, avoid the highway\"); routing engines need explicit numbers and constraints.",
    approach: [
      "Natural-language preference extraction with local LLMs served by Ollama",
      "Structured-output generation against a JSON schema of routing parameters",
      "Evaluating local Qwen2.5 models for structured-output reliability",
      "Iterating on prompts and schemas to reduce hallucinated or omitted preferences",
    ],
    technologies: ["Python", "Ollama", "Qwen2.5", "Local LLMs", "JSON schema"],
    challenges: [
      "Small local models drift from the schema: inventing preferences the driver never stated, or silently dropping ones they did",
      "Ambiguous phrasing (\"a few extra minutes\") has to map to concrete, bounded values",
    ],
    outcomes: ["Ongoing evaluation of Qwen2.5 variants, with prompt and schema revisions aimed at fewer hallucinated and omitted preferences"],
    status: "In active development",
    media: [],
    theme: { accent: "#8a2b2b", label: "Case file" },
  },
  {
    slug: "duckiebot",
    title: "Duckiebot Autonomous Lane-Following",
    highlight: "ROS vision node that keeps a DB21J robot in its lane",
    category: "Robotics · ROS · Computer vision",
    subtitle: "Autonomous lane following on a DB21J Duckiebot.",
    summary:
      "A high-school capstone project: a ROS node that detects lane markings with HSV color segmentation and steers a DB21J Duckiebot to follow the lane, plus a live MJPEG dashboard for watching and debugging the vision pipeline.",
    problem:
      "Make a small robot drive itself around a taped-lane town using only its onboard camera.",
    approach: [
      "HSV-based color detection to isolate the yellow center line and white edge lines",
      "A ROS lane-following node that turns detected lane position into steering commands",
      "An MJPEG dashboard that streams the camera feed and pipeline stages live for debugging",
      "Technical documentation covering system architecture and calibration",
    ],
    technologies: ["ROS", "Python", "Computer vision", "HSV color segmentation", "MJPEG", "DB21J Duckiebot"],
    challenges: [
      "Getting HSV thresholds calibrated reliably, and writing the calibration down so it's repeatable",
      "Debugging a vision pipeline running on the robot, which is what the live MJPEG dashboard is for",
    ],
    outcomes: ["Working lane-following node on the DB21J platform", "Architecture and calibration documentation for future teams"],
    status: "Completed (high-school capstone)",
    media: [],
    theme: { accent: "#f5c400", label: "Robotics lab" },
  },
  {
    slug: "linxicon",
    title: "Linxicon",
    highlight: "Word embeddings explored as a navigable 3D galaxy",
    category: "NLP · Embeddings · 3D visualization",
    subtitle: "Mapping semantic distance between words in an explorable 3D space.",
    summary:
      "A full-stack, decoupled application inspired by the Linxicon word game. A Java backend computes vector embeddings and semantic distances between a dataset of anime terms and everyday dictionary words; a Three.js frontend renders them as glowing spheres joined by curved, glowing connectors that you can fly through in real time.",
    problem:
      "High-dimensional word embeddings are impossible to reason about as raw numbers; the relationships only click when you can see and move through them.",
    approach: [
      "Java backend that parses an anime-themed dataset plus regular dictionary words and manages coordinate mappings",
      "Cosine similarity in latent space to measure semantic distance between terms",
      "Projection of high-dimensional embeddings into a 3D layout of clustered nodes",
      "Interactive Three.js / WebGL frontend for real-time exploration and spatial navigation",
    ],
    technologies: ["Java", "JavaScript", "Three.js", "WebGL", "Vector embeddings"],
    challenges: [
      "Keeping the backend and 3D frontend fully decoupled",
      "Rendering and navigating dense clusters of nodes smoothly in the browser",
    ],
    outcomes: ["Real-time 3D exploration of semantic neighborhoods where anime vocabulary and everyday words share one space"],
    media: [],
    theme: { accent: "#8b7bff", label: "Word network" },
  },
  {
    slug: "court-part-maintenance",
    title: "Court Part Maintenance Tool",
    highlight: "Built for the Kings County DA's Office, still in daily use",
    category: "Full-stack · Government software",
    subtitle: "An internal tool for the Kings County District Attorney's Office.",
    summary:
      "A court part maintenance tool designed and built for the Kings County District Attorney's Office in Brooklyn, with an Angular frontend and .NET backend services. It is still in active use today.",
    problem:
      "The office needed a dependable way to maintain its court part records.",
    approach: [
      "Angular single-page frontend for staff to view and update records",
      ".NET backend services for data access and business logic",
    ],
    technologies: ["Angular", ".NET", "TypeScript", "C#"],
    challenges: ["Building production software for a real government office, where reliability matters more than flash"],
    outcomes: ["Deployed and still in active use at the Kings County District Attorney's Office"],
    status: "In production",
    media: [],
    theme: { accent: "#ff7a1a", label: "Blueprint" },
  },
];



export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
