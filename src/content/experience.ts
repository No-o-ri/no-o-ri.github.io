// Entries come from the resume. `dates` is left empty where the resume gives none.

export type ExperienceCategory =
  | "Research"
  | "Professional Experience"
  | "Technical Leadership";

export type Experience = {
  org: string;
  role: string;
  category: ExperienceCategory;
  dates: string;
  description: string;
  responsibilities: string[];
  skills: string[];
};

export const experience: Experience[] = [
  {
    org: "Alzheimer's EEG Research",
    role: "Independent Researcher · Computational Biology",
    category: "Research",
    dates: "Published · BMES 2025",
    description:
      "Modeled how brain regions drive each other in the alpha band (8–12 Hz) to separate Alzheimer's patients from cognitively normal adults. Published in the American Journal for Young Scientists and presented at the BMES 2025 High School Poster Expo, in collaboration with Dr. Achint Kumar (UCSD) and Ranganathan Srinivasan.",
    responsibilities: [
      "Modeled directed EEG functional coupling with a generalized Kuramoto framework and regularized linear regression, producing per-channel coupling matrices, phase offsets, and node-level in/out-strength",
      "Used Cohen's d to pick the 14 electrodes with the most extreme differences between groups",
      "Trained SVM (RBF), XGBoost, and MLP classifiers on an 80/20 split: the MLP reached 88.2% test accuracy, and occipital electrode O2 alone reached 94.1%",
    ],
    skills: ["Python", "Signal processing", "Kuramoto models", "SVM", "XGBoost", "MLP", "Statistics"],
  },
  {
    org: "NJCCIC",
    role: "Advanced Cybersecurity Intern / Team Leader · Monthly Newsletter Intern",
    category: "Professional Experience",
    dates: "",
    description: "New Jersey Cybersecurity & Communications Integration Cell, the state's cybersecurity agency.",
    responsibilities: [
      "Led 9 students in the advanced cybersecurity cohort",
      "Helped run CTFs, unplugged exercises, escape rooms, case studies, and technical research",
      "Designed cybersecurity-awareness content and wrote articles on recent vulnerabilities published through NJCCIC",
    ],
    skills: ["Cybersecurity", "CTFs", "Technical writing", "Leadership"],
  },
  {
    org: "Garden State CTF",
    role: "Challenge Designer",
    category: "Professional Experience",
    dates: "",
    description: "Built challenges for a capture-the-flag cybersecurity competition.",
    responsibilities: ["Designed challenges spanning web exploitation, cryptography / reverse engineering, and forensics"],
    skills: ["Web exploitation", "Cryptography", "Reverse engineering", "Forensics"],
  },
  {
    org: "HackSocial",
    role: "Co-Founder & Organizer",
    category: "Technical Leadership",
    dates: "2 years",
    description: "A global hackathon, co-founded and run for two consecutive years.",
    responsibilities: [
      "Grew the 2026 event to 600+ participants across 30+ countries with $3,500+ in prizes",
      "Recruited judges from Meta, Warner Bros., and other Fortune 500 companies",
    ],
    skills: ["Event organizing", "Partnerships", "Leadership"],
  },
  {
    org: "South Brunswick HS Computer Science Club",
    role: "Officer",
    category: "Technical Leadership",
    dates: "",
    description: "Officer of the school's computer science club.",
    responsibilities: [
      "Taught cybersecurity through CTF training",
      "Taught a Blender-with-Python course to club members",
      "Planned technical lessons and events with the other officers",
    ],
    skills: ["Teaching", "CTFs", "Blender", "Python"],
  },
];

export const experienceCategories: ExperienceCategory[] = [
  "Research",
  "Professional Experience",
  "Technical Leadership",
];
