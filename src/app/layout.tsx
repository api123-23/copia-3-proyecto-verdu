import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MotorSync } from "@/components/MotorSync";
import { RegistrarSW } from "@/components/RegistrarSW";
import { EfectoScroll } from "@/components/EfectoScroll";
import { EstadoConexion } from "@/components/EstadoConexion";
import "./globals.css";

// Fuentes incluidas en el proyecto (antes se descargaban de Google Fonts en
// cada build y, si esa descarga fallaba, el deploy en Vercel fallaba).
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const jetbrains = localFont({
  src: "./fonts/jetbrains-mono-latin-500-normal.woff2",
  variable: "--font-jetbrains",
  weight: "500",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#003e7a",
  // Evita que Chrome/Samsung Internet oscurezcan la app por su cuenta cuando el
  // celular está en modo oscuro (dejaba la firma negra sobre fondo negro).
  // El modo oscuro propio de la app (html.dark) sigue funcionando.
  colorScheme: "only light",
};

export const metadata: Metadata = {
  title: "Air Power S.A. — Informe Técnico",
  description: "PWA de informes técnicos con sincronización offline",
  manifest: "/manifest.webmanifest",
  applicationName: "Informes",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Air Power",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
};

// Origen de Supabase: se abre la conexión (DNS + TLS) mientras carga la página,
// así el primer pedido (sesión, perfil, informes) no paga ese costo. Está
// permitido por la CSP (connect-src/img-src incluyen este mismo origen).
const origenSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {origenSupabase ? (
          <>
            <link rel="preconnect" href={origenSupabase} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={origenSupabase} />
          </>
        ) : null}
      </head>
      <body className="bg-background font-body-md text-on-surface antialiased">
        <MotorSync />
        <RegistrarSW />
        <EfectoScroll />
        <EstadoConexion />
        {children}
      </body>
    </html>
  );
}
