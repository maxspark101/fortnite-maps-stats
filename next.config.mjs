/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pjocikvezvcjfcmzgbac.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "fortnite-api.com" },
      { protocol: "https", hostname: "cdn2.unrealengine.com" },
      { protocol: "https", hostname: "cdn1.epicgames.com" },
      { protocol: "https", hostname: "*.ol.epicgames.com" },
      { protocol: "https", hostname: "*.unrealengine.com" },
      { protocol: "https", hostname: "*.epicgames.com" },
      { protocol: "https", hostname: "*.qstv.on.epicgames.com" },
    ],
  },
};

export default nextConfig;
