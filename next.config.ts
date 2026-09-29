import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.3 activa por defecto el caché en disco de Turbopack para
    // `next build`. Se corrompía entre builds (local: "Failed to open
    // database"; Vercel: "Can't resolve .../internal/font/google/font") y
    // rompía el deploy. El build tarda ~20 s, así que no vale la pena.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
