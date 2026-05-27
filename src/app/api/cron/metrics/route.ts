import { NextRequest, NextResponse } from "next/server";
import { syncMetrics } from "@/lib/sync";

// Called every 10 minutes by Vercel Cron or external scheduler
// GET /api/cron/metrics
export async function GET(req: NextRequest) {
  // Vercel cron sends Authorization header; external callers use x-cron-secret
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const validVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validExternal = secretHeader === process.env.CRON_SECRET;

  if (!validVercel && !validExternal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMetrics(200);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
