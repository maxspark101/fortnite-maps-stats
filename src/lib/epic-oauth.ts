import crossFetch from "cross-fetch";

const OAUTH_URL = "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token";
const LINKS_URL = "https://links-public-service-live.ol.epicgames.com/links/api/fn/mnemonic";

// fortnitePCGameClient credentials (same client used during setup)
const CLIENT_ID = process.env.EPIC_CLIENT_ID ?? "ec684b8c687f479fadea3cb2ad83f5c6";
const CLIENT_SECRET = process.env.EPIC_CLIENT_SECRET ?? "e1f31c211f28413186262d37a13fc84d";
const BASIC_AUTH = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

// Module-level token cache — valid across requests in the same server process
let _token: string | null = null;
let _tokenExpiry = 0;

async function getEpicToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry - 60_000) return _token;

  const accountId = process.env.EPIC_ACCOUNT_ID;
  const deviceId = process.env.EPIC_DEVICE_ID;
  const secret = process.env.EPIC_SECRET;

  if (!accountId || !deviceId || !secret) {
    throw new Error("Epic Device Auth not configured (run scripts/setup-epic-auth.mjs once)");
  }

  const res = await crossFetch(OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${BASIC_AUTH}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "device_auth",
      account_id: accountId,
      device_id: deviceId,
      secret,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Epic OAuth ${res.status}: ${await res.text()}`);

  const data = await res.json();
  _token = data.access_token as string;
  _tokenExpiry = Date.now() + (data.expires_in as number) * 1000;
  return _token;
}

// Fetches island image URL from Epic's official Links Service.
// Requires EPIC_ACCOUNT_ID, EPIC_DEVICE_ID, EPIC_SECRET in .env.local
// (run scripts/setup-epic-auth.mjs once to generate these).
export async function fetchImageUrlFromEpic(code: string): Promise<string | null> {
  try {
    const token = await getEpicToken();
    const res = await crossFetch(
      `${LINKS_URL}/${encodeURIComponent(code)}/related`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.links?.[code]?.metadata;
    if (!meta) return null;

    return (meta.image_url ?? meta.squareImage ?? meta.landscapeImage ?? null) as string | null;
  } catch {
    return null;
  }
}
