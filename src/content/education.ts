// From the resume. College name and UCSD coursework come from the original PRD.

export const education = {
  university: {
    name: "University of California, San Diego",
    college: "Thurgood Marshall College",
    track: "B.S. Artificial Intelligence",
    graduation: "B.S. expected December 2029",
    masters: "Integrated M.S. expected Spring 2030 or December 2030",
    coursework: ["CSE 11", "CSE 20"],
  },
  highSchool: {
    name: "South Brunswick High School",
    graduation: "June 2026",
    gpa: "4.43 weighted",
    apScores: [
      { course: "Computer Science A", score: 5 },
      { course: "Calculus BC", score: 5 },
      { course: "Statistics", score: 5 },
      { course: "Physics C: Mechanics", score: 5 },
      { course: "Physics C: E&M", score: 5 },
      { course: "English Language", score: 5 },
      { course: "Comparative Government", score: 4 },
    ],
    coursework: ["Data Structures", "Computer Science Capstone", "Mobile Application Development", "Virtual Reality & Game Development"],
  },
  honors: [
    { title: "picoCTF: Top 15% (high school), Top 20% globally", category: "Cybersecurity" },
    { title: "Departmental Award for Outstanding Achievement in Computer Science", category: "Academic" },
    { title: "AP Scholar with Distinction", category: "Academic" },
    { title: "National Merit Commended Student", category: "Academic" },
    { title: "Presidential Volunteer Service Award (Silver)", category: "Service" },
    { title: "NHSMUN Plenary Speaker", category: "Model UN" },
    { title: "Best Delegate, PHILMUN 2026", category: "Model UN" },
    { title: "Outstanding Delegate, RUMUN 2024", category: "Model UN" },
  ],
} as const;
