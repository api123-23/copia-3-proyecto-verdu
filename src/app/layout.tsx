import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { MotorSync } from "@/components/MotorSync";
import { RegistrarSW } from "@/components/RegistrarSW";
import { EfectoScroll } from "@/components/EfectoScroll";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500"],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-background font-body-md text-on-surface antialiased">
        <MotorSync />
        <RegistrarSW />
        <EfectoScroll />
        {children}
      </body>
    </html>
  );
}
