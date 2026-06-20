export type OfficeStatus = "rented" | "unrented" | "restricted";

export interface OfficeCell {
  no: string;
  st: OfficeStatus;
  co: string;
}

export interface FloorSection {
  title: string;
  offices: OfficeCell[];
}

export interface Floor {
  label: string;
  sections: FloorSection[];
}

export type FloorsMap = Record<string, Floor>;
export type OfficeOverrides = Record<string, string>;
