import { NextRequest, NextResponse } from "next/server";
import { syncMetrics } from "@/lib/sync";

// Called every 10 minutes by Vercel Cron or external scheduler
// GET /api/cron/metrics
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
    const result = await syncMetrics(200);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
