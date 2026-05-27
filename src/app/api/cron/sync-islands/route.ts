import { NextRequest, NextResponse } from "next/server";
import { syncIslands } from "@/lib/sync";
import { createServerClient } from "@/lib/supabase/server";

// Runs automatically every hour via Vercel Cron
// Also callable manually: GET /api/cron/sync-islands
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const validVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validExternal = secretHeader === process.env.CRON_SECRET;

  if (!validVercel && !validExternal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Count before sync
  const { count: before } = await supabase
    .from("islands")
    .select("*", { count: "exact", head: true });

  // Fetch up to 30 pages (3000 islands) — catches new maps quickly
  // Full re-scan runs once daily (see schedule: "0 3 * * *")
  const isDaily = req.nextUrl.searchParams.get("full") === "1";
  const pages = isDaily ? 200 : 30;

  try {
    const result = await syncIslands(pages);

    // Count after sync to detect new maps
    const { count: after } = await supabase
      .from("islands")
      .select("*", { count: "exact", head: true });

    const newMaps = (after ?? 0) - (before ?? 0);

    return NextResponse.json({
      ok: true,
      synced: result.updated,
      newMaps,
      totalInDb: after,
      pagesScanned: pages,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
