import { NextRequest, NextResponse } from "next/server";
import { syncMetricsTop } from "@/lib/sync";

// Fast cron — runs every 2 minutes, updates only top 100 maps by current_ccu
// GET /api/cron/metrics-top
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const secretQuery = req.nextUrl.searchParams.get("secret");
  const secret = process.env.CRON_SECRET;
  const valid = authHeader === `Bearer ${secret}` || secretHeader === secret || secretQuery === secret;

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMetricsTop(200);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
