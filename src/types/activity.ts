export type ActivityType =
  | "paid"
  | "invoice"
  | "wa"
  | "email"
  | "created"
  | "receipt";

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  cid: string;
  cname: string;
  desc: string;
  amt: number | null;
  ts: string;
}
