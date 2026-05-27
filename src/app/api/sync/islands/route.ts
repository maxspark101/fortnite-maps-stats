import { NextRequest, NextResponse } from "next/server";
import { syncIslands } from "@/lib/sync";

// Triggered manually or by external cron (e.g. Vercel Cron)
// POST /api/sync/islands?secret=XXX&pages=50
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pages = Number(req.nextUrl.searchParams.get("pages") ?? "50");

  try {
    const result = await syncIslands(pages);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
