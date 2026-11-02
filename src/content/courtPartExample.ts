// SAMPLE DATA for the Court Part Maintenance demo. The real tool (Kings County DA's Office) tracks
// cases in court parts; these parts, dockets and statuses are invented for illustration only.

export type CaseStatus = "Active" | "Adjourned" | "Ready for trial";

export type CourtPart = {
  id: string;
  name: string;
  calendar: string;
  /** Room slot on the floor plan: column 0..2, side -1 (north) or 1 (south). */
  slot: { col: number; side: -1 | 1 };
};

export type CaseRecord = {
  id: string;
  docket: string;
  type: "Felony" | "Misdemeanor";
  status: CaseStatus;
  nextDate: string;
  part: string;
};

export const PARTS: CourtPart[] = [
  { id: "ar1", name: "AR-1", calendar: "Arraignments", slot: { col: 0, side: -1 } },
  { id: "p30", name: "Part 30", calendar: "Felony trials", slot: { col: 1, side: -1 } },
  { id: "p50", name: "Part 50", calendar: "Felony pre-trial", slot: { col: 2, side: -1 } },
  { id: "p21", name: "Part 21", calendar: "Misdemeanor trials", slot: { col: 0, side: 1 } },
  { id: "tapb", name: "TAP B", calendar: "Trial assignment", slot: { col: 1, side: 1 } },
  { id: "p12", name: "Part 12", calendar: "Treatment court", slot: { col: 2, side: 1 } },
];

export const INITIAL_CASES: CaseRecord[] = [
  { id: "c1", docket: "S-2026-0412", type: "Felony", status: "Active", nextDate: "Nov 03", part: "p30" },
  { id: "c2", docket: "S-2026-0388", type: "Felony", status: "Ready for trial", nextDate: "Nov 05", part: "p30" },
  { id: "c3", docket: "S-2026-0501", type: "Felony", status: "Adjourned", nextDate: "Dec 01", part: "p30" },
  { id: "c4", docket: "S-2026-0517", type: "Felony", status: "Active", nextDate: "Oct 28", part: "p50" },
  { id: "c5", docket: "S-2026-0533", type: "Felony", status: "Active", nextDate: "Nov 10", part: "p50" },
  { id: "c6", docket: "S-2026-0540", type: "Misdemeanor", status: "Active", nextDate: "Oct 24", part: "ar1" },
  { id: "c7", docket: "S-2026-0541", type: "Felony", status: "Active", nextDate: "Oct 24", part: "ar1" },
  { id: "c8", docket: "S-2026-0298", type: "Misdemeanor", status: "Ready for trial", nextDate: "Nov 12", part: "p21" },
  { id: "c9", docket: "S-2026-0311", type: "Misdemeanor", status: "Adjourned", nextDate: "Nov 19", part: "p21" },
  { id: "c10", docket: "S-2026-0274", type: "Felony", status: "Ready for trial", nextDate: "Nov 04", part: "tapb" },
  { id: "c11", docket: "S-2026-0466", type: "Misdemeanor", status: "Active", nextDate: "Nov 07", part: "p12" },
  { id: "c12", docket: "S-2026-0472", type: "Felony", status: "Adjourned", nextDate: "Dec 08", part: "p12" },
];

const DOCKETS = [602, 611, 618, 624, 637, 645, 652, 669];
/** Builds the n-th "new" sample case for the intake button. */
export function makeIntakeCase(n: number, part: string): CaseRecord {
  const num = DOCKETS[n % DOCKETS.length] + Math.floor(n / DOCKETS.length) * 100;
  return {
    id: `new${n}`,
    docket: `S-2026-0${num}`,
    type: n % 3 === 0 ? "Misdemeanor" : "Felony",
    status: "Active",
    nextDate: "Oct 30",
    part,
  };
}
