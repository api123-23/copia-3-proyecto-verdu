import type { NextConfig } from "next";

const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no se puede incrustar en otros sitios (evita clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Cámara y ubicación solo para la propia app; micrófono y demás, bloqueados.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      // El service worker nunca se sirve desde caché HTTP: las actualizaciones llegan siempre.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  experimental: {
    // Next 16.3 activa por defecto el caché en disco de Turbopack para
    // `next build`. Se corrompía entre builds (local: "Failed to open
    // database"; Vercel: "Can't resolve .../internal/font/google/font") y
    // rompía el deploy. El build tarda ~20 s, así que no vale la pena.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
