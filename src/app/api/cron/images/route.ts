import { NextRequest, NextResponse } from "next/server";
import { syncImages } from "@/lib/sync";

// Refreshes images for active maps every 6 hours
// GET /api/cron/images
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const validVercel = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const validExternal = secretHeader === process.env.CRON_SECRET;

  if (!validVercel && !validExternal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncImages(30);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
