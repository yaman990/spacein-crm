/**
 * Schematic floor-plan layout for Floor 5, derived from the architectural CAD
 * drawings (All FlaT / FlaT 2 / FlaT 3). Offices are placed in their real
 * relative arrangement — the left open-plan cluster + perimeter (501–531), the
 * middle double-loaded corridor with reception (532–561), and the curved end
 * (562–599) — rather than to exact mm scale. Coordinates are in viewBox units.
 */

export interface OfficeRect {
  no: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LandmarkKind = "reception" | "room" | "vertical" | "service";

export interface Landmark {
  label: string;
  kind: LandmarkKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorLayout {
  width: number;
  height: number;
  corridor: { x: number; y: number; w: number; h: number }[];
  offices: OfficeRect[];
  landmarks: Landmark[];
}

// --- helpers -------------------------------------------------------------
const range = (a: number, b: number): string[] => {
  const out: string[] = [];
  for (let n = a; n <= b; n++) out.push(String(n));
  return out;
};

function col(
  nos: string[],
  x: number,
  yStart: number,
  w: number,
  h: number,
  gap = 6,
): OfficeRect[] {
  return nos.map((no, i) => ({ no, x, y: yStart + i * (h + gap), w, h }));
}

function row(
  nos: string[],
  y: number,
  xStart: number,
  w: number,
  h: number,
  gap = 6,
): OfficeRect[] {
  return nos.map((no, i) => ({ no, x: xStart + i * (w + gap), y, w, h }));
}

function arc(
  nos: string[],
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  w: number,
  h: number,
): OfficeRect[] {
  return nos.map((no, i) => {
    const t = nos.length === 1 ? 0.5 : i / (nos.length - 1);
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    return {
      no,
      x: cx + r * Math.cos(a) - w / 2,
      y: cy + r * Math.sin(a) - h / 2,
      w,
      h,
    };
  });
}

// --- ZONE A: open-plan cluster + perimeter (501–531) ---------------------
const zoneA: OfficeRect[] = [
  // central open-plan cluster — two columns
  ...col(["501", "502", "503", "504", "505"], 250, 112, 80, 64), // right column
  ...col(["509", "508", "507", "506"], 160, 184, 80, 64), // left column
  // left wall
  ...col(range(510, 515), 24, 96, 56, 70),
  // right wall of the cluster (524 top → 519 bottom)
  ...col(["524", "523", "522", "521", "520", "519"], 372, 96, 56, 70),
  // top wall (529 standalone near wash area, then 525–528)
  ...row(["529", "525", "526", "527", "528"], 40, 90, 56, 44),
  // bottom wall
  ...row(["530", "516", "517", "518"], 528, 90, 56, 44),
  // 531 — corner office on the left edge
  { no: "531", x: 24, y: 40, w: 56, h: 44 },
];

// --- ZONE B: double-loaded corridor + reception (532–561) ----------------
const zoneB: OfficeRect[] = [
  // inner block — two rows above the corridor
  ...row(range(532, 539), 70, 470, 52, 78),
  ...row(range(540, 547), 158, 470, 52, 78),
  // junction offices near Zone A
  ...row(["548", "549", "550"], 386, 470, 52, 64),
  // window wall along the bottom edge
  ...row(range(551, 561), 480, 470, 40, 90),
];

// --- ZONE C: round flat / curved end (562–599) ---------------------------
// Per FlaT 1: a short straight approach (562–569) that bends into a rounded
// corner with two concentric rings — inner offices (570–584) and the outer
// curved window wall (585–599).
const zoneC: OfficeRect[] = [
  ...row(["562", "563", "564", "565"], 70, 1000, 46, 78), // approach, top
  ...row(["566", "567", "568", "569"], 480, 1000, 46, 90), // approach, bottom
  ...arc(range(570, 584), 1300, 300, 150, -86, 86, 40, 36), // inner ring
  ...arc(range(585, 599), 1300, 300, 212, -86, 86, 48, 40), // outer window wall
];

export const FLOOR5_LAYOUT: FloorLayout = {
  width: 1600,
  height: 640,
  corridor: [
    { x: 90, y: 96, w: 60, h: 456 }, // Zone A internal corridor
    { x: 440, y: 250, w: 860, h: 84 }, // main spine through B & C
  ],
  offices: [...zoneA, ...zoneB, ...zoneC],
  landmarks: [
    { label: "Lifts", kind: "vertical", x: 414, y: 96, w: 44, h: 120 },
    { label: "Toilets", kind: "service", x: 414, y: 40, w: 44, h: 48 },
    { label: "Stairs", kind: "vertical", x: 414, y: 470, w: 44, h: 82 },
    { label: "Print Room", kind: "room", x: 470, y: 250, w: 80, h: 84 },
    { label: "Reception", kind: "reception", x: 600, y: 262, w: 150, h: 60 },
    { label: "Meeting Room", kind: "room", x: 790, y: 262, w: 110, h: 60 },
  ],
};
