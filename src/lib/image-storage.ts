import crossFetch from "cross-fetch";
import { createServerClient } from "./supabase/server";

const BUCKET = "island-images";

// Returns true if this URL is already hosted in our Supabase Storage bucket
export function isStorageUrl(url: string | null): boolean {
  if (!url) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!base && url.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
}

// Downloads an image from an external URL and uploads it to Supabase Storage.
// Returns the public Supabase Storage URL on success, or null on failure.
export async function uploadIslandImage(
  code: string,
  externalUrl: string
): Promise<string | null> {
  try {
    const res = await crossFetch(externalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      },
    });
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    if (!arrayBuffer.byteLength) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("webp") ? "webp"
      : contentType.includes("png") ? "png"
      : "jpg";

    const filename = `${code}.${ext}`;
    const supabase = createServerClient();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, Buffer.from(arrayBuffer), {
        contentType,
        upsert: true,
        cacheControl: "2592000", // 30 days
      });

    if (error) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  } catch {
    return null;
  }
}
