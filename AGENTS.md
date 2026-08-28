<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Current Task Summary (pinned by opencode)
- **Objective:** Terminar la PWA offline-first de informes técnicos (Air Power S.A.): navegación/creación offline, service worker con precache de build, instalable desde el celular, y (en curso) logo + pulso de UI móvil.
- **Logo:** El usuario adjuntó la imagen `/Users/ignacioricciutti/Downloads/WhatsApp Image 2026-08-28 at 11.00.10.jpg` (1024x1024). Copiada a `public/icons/logo-origen.jpg` (fuente reproducible). Reemplaza al rayo SVG anterior: `tags/scripts/generar-iconos.mjs` ahora genera icon-180/192/512 desde esa imagen (`sharp`, fit cover → PNG; verificado). El modelo NO puede ver la imagen: falta validación visual humana.
- **Íconos/PWA:** manifest apunta a `/icons/icon-192.png` (any), `/icons/icon-512.png` (any + maskable), `apple-touch-icon` = icon-180. `layout.tsx` meta iOS + viewportFit cover + theme #003e7a.
- **Ubicaciones del logo en la app:** login (`src/app/login/page.tsx`, 80px rounded-2xl centrado), cabecera fija de lista (`page.tsx`, w-7) y editor (`EditorInforme.tsx`, w-7, oculto en <sm), barra "AIR POWER S.A." de ambas vistas (w-5). Componente `src/components/LogoTipo.tsx` con `img` a `/icons/icon-192.png`.
- **UI polish (móvil):** feedback táctil `active:scale-*` en cabeceras/ENVIAR/NUEVO/Crear informe/tarjetas/Actualizar; íconos add/send en botones; estado vacío del listado con logo; safe-area-inferior (`env(safe-area-inset-bottom)` + 3rem) en lista/editor/login; `overscroll-behavior-y: none` y `-webkit-tap-highlight-color: transparent` en `globals.css` (CSS de base, no prólogo `@layer` para touch-action). Build OK (0 errores TS), lint 0 errores (mismos 5 warnings previos).
- **Pendiente:** deploy (regenerar `public/sw.js` del precache ya hecho por build), ejecutar `supabase/schema.sql` en Supabase, y verificación visual del logo en celular (instalación PWA).

<!-- END -->
