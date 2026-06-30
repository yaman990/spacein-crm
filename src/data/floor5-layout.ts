/**
 * Schematic floor-plan layout for Floor 5, traced from the architectural CAD
 * drawing (All FlaT). The real floor is one long, narrow, double-loaded
 * corridor: offices packed on both sides of a single spine, with a central
 * open-plan island at one end (501–509) and a rounded/curved end at the other
 * (562–599). Rendered horizontally (the drawing rotated 90°) to fit the screen.
 * Coordinates are in viewBox units.
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

// a horizontal run of offices (left → right)
function row(
  nos: string[],
  y: number,
  xStart: number,
  w: number,
  h: number,
  gap = 4,
): OfficeRect[] {
  return nos.map((no, i) => ({ no, x: xStart + i * (w + gap), y, w, h }));
}

// a vertical stack of offices (top → bottom)
function col(
  nos: string[],
  x: number,
  yStart: number,
  w: number,
  h: number,
  gap = 4,
): OfficeRect[] {
  return nos.map((no, i) => ({ no, x, y: yStart + i * (h + gap), w, h }));
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

// office cell sizes
const NW = 46; // north/south office width
const NH = 62; // north/south office height
const NORTH_Y = 70;
const SOUTH_Y = 312;

// =========================================================================
//  ZONE 1 — open-plan island end (501–531), far left
// =========================================================================
const islandLeft = col(["509", "508", "507", "506"], 150, 150, 66, 56); // inner col
const islandRight = col(["501", "502", "503", "504", "505"], 222, 150, 66, 56);
const leftWall = col(range(510, 515), 70, 70, 66, 56); // outer wall column
const innerWall = col(["519", "520", "521", "522", "523", "524"], 300, 70, 66, 56);
const topWall = row(["525", "526", "527", "528", "529"], 70, 380, NW, NH); // top edge
const bottomWall = row(["516", "517", "518", "530", "531"], SOUTH_Y, 380, NW, NH);

const zone1: OfficeRect[] = [
  ...leftWall,
  ...islandLeft,
  ...islandRight,
  ...innerWall,
  ...topWall,
  ...bottomWall,
];

// =========================================================================
//  ZONE 2 — double-loaded corridor (532–561)
// =========================================================================
// north side (window wall) and south side (inner offices), packed both sides
const zone2: OfficeRect[] = [
  ...row(range(532, 546), NORTH_Y, 610, NW, NH), // 15 north
  ...row(range(547, 561), SOUTH_Y, 610, NW, NH), // 15 south
];

// =========================================================================
//  ZONE 3 — rounded / curved end (562–599)
// =========================================================================
const APPROACH_X = 1370;
const zone3: OfficeRect[] = [
  ...row(["562", "563", "564", "565"], NORTH_Y, APPROACH_X, NW, NH),
  ...row(["566", "567", "568", "569"], SOUTH_Y, APPROACH_X, NW, NH),
  ...arc(range(570, 584), 1640, 197, 132, -88, 88, 42, 38), // inner ring
  ...arc(range(585, 599), 1640, 197, 190, -90, 90, 48, 42), // outer window wall
];

export const FLOOR5_LAYOUT: FloorLayout = {
  width: 1900,
  height: 470,
  offices: [...zone1, ...zone2, ...zone3],
  corridor: [
    // U-shaped corridor wrapping the island
    { x: 124, y: 132, w: 24, h: 196 }, // left of island
    { x: 290, y: 132, w: 16, h: 196 }, // right of island
    { x: 124, y: 132, w: 182, h: 18 }, // above island
    { x: 124, y: 310, w: 182, h: 18 }, // below island
    // main spine through zones 2 & 3
    { x: 360, y: 196, w: 1290, h: 56 },
  ],
  landmarks: [
    { label: "Lifts", kind: "vertical", x: 380, y: 158, w: 46, h: 80 },
    { label: "Stairs", kind: "vertical", x: 432, y: 158, w: 46, h: 80 },
    { label: "Toilets", kind: "service", x: 484, y: 158, w: 46, h: 36 },
    { label: "Void", kind: "service", x: 484, y: 200, w: 46, h: 38 },
    { label: "Print Room", kind: "room", x: 560, y: 168, w: 44, h: 96 },
    { label: "Reception", kind: "reception", x: 1130, y: 200, w: 130, h: 48 },
    { label: "Meeting Room", kind: "room", x: 1276, y: 200, w: 90, h: 48 },
  ],
};
