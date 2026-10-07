<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Proyecto VERDU (Air Power S.A.) — reglas vigentes

PWA offline-first de informes técnicos (Next.js 16 + React 19, Dexie, Supabase). Producción: https://verdu-y-cia.vercel.app (deploy = push a `main`). El historial de cambios está en git, no acá.

**Reglas de trabajo**
- Verificar todo antes de cada push o cambio de DB: `npm run build` y las pruebas e2e de `~/Proyectos/verdu-pruebas`. Ningún cambio puede corromper informes existentes ni romper la sincronización offline. Cambios chicos y revertibles (un commit por cambio).
- Preguntar al usuario antes de cambiar reglas de negocio de los informes (campos, opciones, validaciones).
- Commits en español, sin `Co-Authored-By` ni menciones a IA.

**Base de datos**
- Todo cambio va en `supabase/schema.sql`. Tiene que ser idempotente: se ejecuta entero muchas veces, sin perder datos y sin UPDATE/DELETE incondicionales. El usuario lo ejecuta a mano en Supabase. Nunca tocar la base directamente.
- Helpers del schema: `dropar_checks_de_columna(tabla, columna)` para cambiar dominios CHECK y `garantizar_cascade(tabla)` para las FK hijas con `on delete cascade`.
- Numeración: el servidor asigna `numero_registro` dentro de la RPC `sincronizar_informe_completo`, en la misma transacción. No usar triggers con `nextval()`, porque queman números en los upsert. El cliente muestra "№ —" hasta sincronizar.
- `sincronizar_informe_completo` rechaza claves desconocidas.

**Build y guardas**
- `npm run build` = `scripts/verificar-datos.mjs` → `next build` → `scripts/generate-sw.mjs`.
  - `verificar-datos` falla si un campo de pantalla no llega a la base o al PDF (`CAMPOS_GE`/`CAMPOS_POR_TIPO`, sync.ts, schema.sql), o si el schema tiene un UPDATE/DELETE sin WHERE o con `= null` sin un comentario `-- seguro:` antes.
  - Al agregar un campo: va en la lista de envío y en schema.sql, y se muestra con `aplica(tipo, "campo")`.
- `public/sw.js` lo genera el build (service worker propio con precache) y se commitea.

**Trampas conocidas**
- Valores legacy (si/no, mal, optimo…): `normalizarValores` (src/lib/informes.ts) los convierte al cargar, construir y traer del servidor. No eliminarla.
- Íconos: SVG inline en `src/components/Icono.tsx`. No usar fuentes ni recursos externos, porque no funcionan offline.
- Rutas por hash (`src/lib/hashRuta.ts`): `/informe/nuevo` se evalúa antes que `/informe/:id`. `src/app/informe/{nuevo,[id]}/page.tsx` son shims para enlaces viejos y no se borran.
- `perfiles`: cada usuario edita su nombre y apellido (política `perfiles_update_own`) pero no puede cambiarse el rol.
- Que un master pueda editar o borrar archivos de informes ajenos en storage es intencional.
