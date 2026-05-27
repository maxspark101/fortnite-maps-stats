import { NextRequest, NextResponse } from "next/server";
import { syncImages } from "@/lib/sync";

// POST /api/sync/images — fetches thumbnail URLs from Epic LinksService
// Run repeatedly until updated=0 (all islands have been processed)
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = Number(req.nextUrl.searchParams.get("batch") ?? "50");

  try {
    const result = await syncImages(batch);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
