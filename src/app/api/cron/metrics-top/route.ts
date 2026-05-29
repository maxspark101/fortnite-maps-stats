import { NextRequest, NextResponse } from "next/server";
import { syncMetricsTop } from "@/lib/sync";

// Fast cron — runs every 2 minutes, updates only top 100 maps by current_ccu
// GET /api/cron/metrics-top
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const validVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validExternal = secretHeader === process.env.CRON_SECRET;

  if (!validVercel && !validExternal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMetricsTop(200);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
