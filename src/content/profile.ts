// Single source of truth for identity + links. Facts come from the resume
// (resume_Siddharth_Nori_AIML_UCSD.docx, exported to public/resume/).

import { asset } from "@/lib/asset";

export const profile = {
  name: "Siddharth Nori",
  shortName: "SN.",
  headline: "Artificial Intelligence",
  school: "UC San Diego",
  tagline:
    "AI student at UC San Diego. I build local-LLM systems, autonomous robots and 3D web tools, and I've published EEG research on Alzheimer's detection.",
  email: "sidnori@gmail.com",
  githubUrl: "https://github.com/no-o-ri",
  linkedinUrl: "https://www.linkedin.com/in/siddharth-nori-02b226338",
  resumeUrl: asset("/resume/Siddharth_Nori_Resume.pdf"),
  intro:
    "B.S. Artificial Intelligence student at UC San Diego (B.S. December 2029, integrated M.S. 2030). I like problems where machine learning meets the real world: turning messy human language into structured data, getting a robot to stay in its lane, and finding signal in brain activity.",
  background:
    "My published research models directed EEG coupling to tell Alzheimer's patients apart from cognitively normal adults (best classifier: 88% test accuracy). I've shipped software that the Kings County District Attorney's Office still uses, led a cybersecurity cohort at the NJCCIC, and co-founded a hackathon that reached 600+ participants in 30+ countries.",
  interests: [
    "Applied machine learning and local LLMs",
    "Robotics and computer vision",
    "Computational neuroscience",
    "Cybersecurity and CTFs",
    "3D graphics and interactive web",
  ],
  skills: {
    Languages: ["Python", "Java", "JavaScript", "C# (Unity)", "HTML"],
    "AI / ML": ["Ollama", "LLM structured outputs", "Qwen2.5", "SVM", "XGBoost", "MLP", "Regularized regression"],
    "Robotics & graphics": ["ROS", "HSV color segmentation", "Three.js", "WebGL", "Blender", "Unity"],
    "Web & tools": ["Angular", ".NET", "Microsoft Office"],
  } as Record<string, string[]>,
  beyondCode: ["Competitive Pokémon", "Model UN (Best Delegate, PHILMUN 2026)", "Music", "Organizing hackathons"],
} as const;

export type NavLink = { href: string; label: string };

export const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/education", label: "Education" },
  { href: "/experience", label: "Experience" },
];
