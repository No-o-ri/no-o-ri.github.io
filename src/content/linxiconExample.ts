// ILLUSTRATIVE example graph for the visualization only.
// These words, relations and positions are hand-written to show what Linxicon's output looks like:
// anime vocabulary and everyday words embedded in the same space. They are NOT real embedding results
// and must not be presented as such. Replace with real, verified data when available.

export type Rel = "similar" | "part of" | "associated" | "opposite";

export const GROUPS = [
  { name: "Shonen", kind: "anime", color: "#ff9a6b", center: [-6, 1.5, 3] as [number, number, number] },
  { name: "Mecha", kind: "anime", color: "#5fd8ff", center: [6, -1.5, 3] as [number, number, number] },
  { name: "Isekai", kind: "anime", color: "#b9a0ff", center: [0, 5.5, -3.5] as [number, number, number] },
  { name: "Slice of life", kind: "anime", color: "#ff8fc7", center: [-4.5, -4.5, -3] as [number, number, number] },
  { name: "Nature", kind: "everyday", color: "#7dffb0", center: [5.5, 4.2, -3.5] as [number, number, number] },
  { name: "Mind", kind: "everyday", color: "#ffd86b", center: [0, -0.5, -7.5] as [number, number, number] },
] as const;

const WORDS: string[][] = [
  ["shonen", "naruto", "luffy", "goku", "ninja", "chakra", "nakama"],
  ["mecha", "gundam", "evangelion", "pilot", "robot", "kaiju", "titan"],
  ["isekai", "reborn", "hero", "sword", "magic", "dungeon", "slime"],
  ["senpai", "school", "sakura", "ramen", "festival", "kawaii", "uniform"],
  ["ocean", "river", "rain", "storm", "sun", "sky", "mountain"],
  ["mind", "dream", "memory", "thought", "courage", "friendship", "idea"],
];

export type GNode = { id: number; word: string; group: number; hub: boolean };
export const NODES: GNode[] = WORDS.flatMap((ws, g) => ws.map((word, i) => ({ id: 0, word, group: g, hub: i === 0 })))
  .map((n, i) => ({ ...n, id: i }));

const idOf = (w: string) => NODES.find((n) => n.word === w)!.id;

const EXTRA: [string, string, Rel][] = [
  // within groups
  ["naruto", "ninja", "associated"], ["ninja", "chakra", "associated"], ["goku", "luffy", "similar"], ["naruto", "nakama", "associated"],
  ["gundam", "robot", "part of"], ["evangelion", "pilot", "associated"], ["kaiju", "titan", "similar"], ["pilot", "robot", "associated"],
  ["sword", "magic", "associated"], ["dungeon", "slime", "associated"], ["reborn", "hero", "associated"], ["hero", "sword", "associated"],
  ["sakura", "festival", "associated"], ["school", "uniform", "part of"], ["ramen", "festival", "associated"], ["kawaii", "uniform", "associated"],
  ["rain", "storm", "similar"], ["sun", "sky", "associated"], ["mountain", "sky", "associated"], ["storm", "sky", "part of"],
  ["dream", "memory", "associated"], ["thought", "idea", "similar"], ["courage", "friendship", "associated"],
  // anime ↔ everyday: the cross-links that make the map unusual
  ["luffy", "ocean", "associated"], ["nakama", "friendship", "similar"], ["goku", "courage", "associated"], ["chakra", "mind", "associated"],
  ["evangelion", "thought", "associated"], ["kaiju", "storm", "associated"], ["titan", "mountain", "similar"], ["pilot", "sky", "associated"],
  ["hero", "courage", "associated"], ["magic", "dream", "associated"], ["reborn", "memory", "associated"], ["dungeon", "mountain", "associated"],
  ["sakura", "rain", "associated"], ["school", "memory", "associated"], ["hero", "kaiju", "opposite"], ["storm", "sun", "opposite"],
];

export type GEdge = { a: number; b: number; rel: Rel };
export const EDGES: GEdge[] = (() => {
  const out: GEdge[] = [];
  const seen = new Set<string>();
  const add = (a: number, b: number, rel: Rel) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || seen.has(k)) return;
    seen.add(k);
    out.push({ a, b, rel });
  };
  // each group's hub connects to every member
  WORDS.forEach((ws) => ws.slice(1).forEach((w) => add(idOf(ws[0]), idOf(w), "associated")));
  EXTRA.forEach(([a, b, r]) => add(idOf(a), idOf(b), r));
  return out;
})();

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

/** Deterministic layouts: where words float "isolated" first, and where they settle in clusters. */
export const SCATTER: [number, number, number][] = (() => {
  const r = rng(11);
  return NODES.map(() => [(r() - 0.5) * 20, (r() - 0.5) * 14, (r() - 0.5) * 14]);
})();

export const CLUSTERED: [number, number, number][] = (() => {
  const r = rng(29);
  return NODES.map((n) => {
    const c = GROUPS[n.group].center;
    if (n.hub) return [...c] as [number, number, number];
    const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), rad = 1.7 + r() * 1.1;
    return [c[0] + rad * Math.sin(v) * Math.cos(u), c[1] + rad * Math.cos(v), c[2] + rad * Math.sin(v) * Math.sin(u)];
  });
})();

export const neighborsOf = (id: number) =>
  EDGES.filter((e) => e.a === id || e.b === id).map((e) => ({ other: e.a === id ? e.b : e.a, rel: e.rel }));
