import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Test env vars
  results.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  results.has_service_key = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 2. Test Supabase connection
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from("islands").select("code").limit(1);
    results.supabase_query = error ? `ERROR: ${error.message}` : `OK — rows: ${data?.length}`;
  } catch (e) {
    results.supabase_query = `EXCEPTION: ${String(e)}`;
  }

  // 3. Test Epic API
  try {
    const res = await fetch("https://api.fortnite.com/ecosystem/v1/islands?limit=1");
    results.epic_api = res.ok ? `OK — status ${res.status}` : `FAIL — status ${res.status}`;
  } catch (e) {
    results.epic_api = `EXCEPTION: ${String(e)}`;
  }

  return NextResponse.json(results);
}
