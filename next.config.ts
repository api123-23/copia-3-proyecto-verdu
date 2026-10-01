import type { NextConfig } from "next";

// Origen de Supabase (API, login y fotos/firmas firmadas). Es el único sitio
// externo que la app contacta desde el navegador: la IA pasa por /api.
const origenSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();

// Política de contenido: el navegador solo carga código, estilos, imágenes y
// conexiones de la propia app y de Supabase. Next necesita scripts y estilos
// en línea; en desarrollo además usa eval.
const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${origenSupabase}`,
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${origenSupabase}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: politicaContenido },
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
