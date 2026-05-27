"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function refreshKeywordsAction(): Promise<{ ok: boolean; error?: string; keywords?: number }> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("refresh_keyword_stats");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/keywords");
  const result = data as { keywords: number; updated_at: string } | null;
  return { ok: true, keywords: result?.keywords };
}
