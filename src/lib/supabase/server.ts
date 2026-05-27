import { createClient } from "@supabase/supabase-js";
import crossFetch from "cross-fetch";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: crossFetch } }
  );
}
