import { runContractChecksAction } from "@/actions/contracts";

// Scheduled billing: issues due payment cycles, auto-renews, marks expiries and
// sends reminders. Triggered daily by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer ${CRON_SECRET}`. Never cached.
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runContractChecksAction(secret);
    return Response.json({ ok: true, summary });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "failed" },
      { status: 500 },
    );
  }
}
