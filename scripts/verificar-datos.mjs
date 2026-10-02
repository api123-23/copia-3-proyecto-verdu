// Verificación de integridad de datos. Corre antes de cada build (y por lo
// tanto antes de cada deploy en Vercel): si algún campo que el técnico carga en
// pantalla no llega a la base o al PDF, o si schema.sql tiene una instrucción
// que modifica datos sin condición, el build falla y la versión NO se publica.
//
// Se puede correr a mano con: node scripts/verificar-datos.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = (rel) => readFileSync(path.join(raiz, rel), "utf8");
const errores = [];
const error = (msg) => errores.push(msg);

const informes = leer("src/lib/informes.ts");
const valoresUI = leer("src/components/informe/SeccionValores.tsx");
const sync = leer("src/lib/sync.ts");
const schema = leer("supabase/schema.sql");

// ---------- Listas de campos que se envían ----------
function bloque(texto, desde) {
  const i = texto.indexOf(desde);
  if (i < 0) throw new Error(`No se encontró "${desde}"`);
  // El valor empieza después del "=" (la anotación de tipo puede tener [] o {}).
  const igual = texto.indexOf("=", i);
  const ini = texto.slice(igual).search(/[[{]/) + igual;
  const abre = texto[ini], cierra = abre === "[" ? "]" : "}";
  let nivel = 0;
  for (let k = ini; k < texto.length; k++) {
    if (texto[k] === abre) nivel++;
    else if (texto[k] === cierra && --nivel === 0) return texto.slice(ini, k + 1);
  }
  throw new Error(`Bloque sin cerrar: ${desde}`);
}
const literales = (t) => [...t.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);

const camposGE = new Set(literales(bloque(informes, "export const CAMPOS_GE")));
const porTipoTexto = bloque(informes, "export const CAMPOS_POR_TIPO");
const camposPorTipo = {};
for (const m of porTipoTexto.matchAll(/([a-z_]+):\s*\[([^\]]*)\]/g)) camposPorTipo[m[1]] = literales(m[2]);
const tiposConValores = ["motocompresor", "compresor", "vehiculos", "maquinas_viales", "secadores"];
for (const t of tiposConValores) if (!camposPorTipo[t]) error(`CAMPOS_POR_TIPO no tiene la lista de "${t}"`);
const todosEstandar = new Set(Object.values(camposPorTipo).flat());

// ---------- Campos que se cargan en pantalla ----------
const camposUI = new Set([
  ...[...valoresUI.matchAll(/campo="([a-z0-9_]+)"/g)].map((m) => m[1]),
  ...[...valoresUI.matchAll(/"(ge_[a-z0-9_]+)"/g)].map((m) => m[1]),
]);
// Los campos del resto de equipos solo se muestran si aplica(tipo, campo), que
// mira CAMPOS_POR_TIPO: mostrar y enviar coinciden por construcción. Se exige
// que todo campo estándar de la pantalla esté condicionado por aplica().
const condicionados = new Set([...valoresUI.matchAll(/aplica\(tipo,\s*"([a-z0-9_]+)"\)/g)].map((m) => m[1]));
for (const c of camposUI) {
  if (c.startsWith("ge_")) {
    if (!camposGE.has(c)) error(`Grupo electrógeno: el campo "${c}" se carga en pantalla pero NO está en CAMPOS_GE (no se guardaría ni se imprimiría).`);
  } else if (!condicionados.has(c)) {
    error(`Valores: el campo "${c}" se muestra en pantalla sin aplica(tipo, "${c}"): podría mostrarse en un equipo donde no se guarda.`);
  }
}
for (const c of camposGE) if (!camposUI.has(c)) error(`Grupo electrógeno: "${c}" está en CAMPOS_GE pero no hay dónde cargarlo en pantalla (quedaría siempre vacío).`);
for (const c of todosEstandar) if (!camposUI.has(c)) error(`Valores: "${c}" está en CAMPOS_POR_TIPO pero no hay dónde cargarlo en pantalla (quedaría siempre vacío).`);

// ---------- Columnas de la base según schema.sql ----------
// Se recorre el archivo en orden: create table, add column, drop column y rename.
const columnas = {};
const sinCuerposDeFunciones = schema.replace(/\$\$[\s\S]*?\$\$/g, (cuerpo) =>
  // Dentro de bloques "do $$" se conservan solo las instrucciones de columnas.
  cuerpo.split("\n").filter((l) => /alter table|add column|drop column|rename column/i.test(l)).join("\n")
);
const tabla = (n) => n.replace(/^public\./, "");
for (const m of sinCuerposDeFunciones.matchAll(/create table if not exists ([a-z_.]+)\s*\(([\s\S]*?)\n\);/gi)) {
  const t = tabla(m[1]);
  columnas[t] ??= new Set();
  for (const l of m[2].split("\n")) {
    const c = /^\s+([a-z_0-9]+)\s+(uuid|text|numeric|int|integer|boolean|timestamptz|bigint|date)\b/i.exec(l);
    if (c) columnas[t].add(c[1]);
  }
}
for (const m of sinCuerposDeFunciones.matchAll(/alter table (?:if exists )?([a-z_.]+)\s+(add column if not exists|add column|drop column if exists|drop column|rename column)\s+([a-z_0-9]+)(?:\s+to\s+([a-z_0-9]+))?/gi)) {
  const t = tabla(m[1]);
  columnas[t] ??= new Set();
  const accion = m[2].toLowerCase();
  if (accion.startsWith("add")) columnas[t].add(m[3]);
  else if (accion.startsWith("drop")) columnas[t].delete(m[3]);
  else if (m[4]) { columnas[t].delete(m[3]); columnas[t].add(m[4]); }
}
const tablaDeTipo = { motocompresor: "informes_motocompresor", compresor: "informes_compresor", vehiculos: "informes_vehiculos", maquinas_viales: "informes_vehiculos", secadores: "informes_secadores" };
// Renombres que hace construirAnexa antes de enviar (informes.ts).
const renombres = { compresor: { perdida_aceite_motor: "perdida_aceite_unidad" } };
if (!/out\.perdida_aceite_unidad = out\.perdida_aceite_motor/.test(informes)) error('construirAnexa ya no renombra perdida_aceite_motor → perdida_aceite_unidad para compresor: revisar "renombres" en este script.');
for (const t of tiposConValores) {
  const cols = columnas[tablaDeTipo[t]];
  if (!cols) { error(`schema.sql no define la tabla ${tablaDeTipo[t]}`); continue; }
  for (const c of camposPorTipo[t] ?? []) {
    const destino = renombres[t]?.[c] ?? c;
    if (!cols.has(destino)) error(`${t}: el campo "${c}" se envía como "${destino}" pero la tabla ${tablaDeTipo[t]} no tiene esa columna (el dato se perdería).`);
  }
}
for (const c of camposGE) if (!columnas.informes_grupo_electrogeno?.has(c)) error(`Grupo electrógeno: "${c}" no existe como columna en informes_grupo_electrogeno (el dato se perdería).`);

// ---------- Datos generales que se envían (sync.ts) ----------
const payload = bloque(sync, "const payload = {");
const clavesPayload = new Set([...payload.matchAll(/^\s+([a-z_]+):/gm)].map((m) => m[1]));
const colsGenerales = columnas.informes_generales ?? new Set();
for (const k of clavesPayload) if (!colsGenerales.has(k)) error(`sync.ts envía "${k}" pero informes_generales no tiene esa columna (el dato se perdería).`);
// Columnas que asigna el servidor y no hace falta enviar.
const asignadasPorServidor = new Set(["modo_informe"]);
for (const c of colsGenerales) if (!clavesPayload.has(c) && !asignadasPorServidor.has(c)) error(`informes_generales tiene la columna "${c}" pero sync.ts no la envía (quedaría vacía o se pisaría).`);

// ---------- schema.sql no puede modificar datos sin condición ----------
// Toda instrucción UPDATE/DELETE fuera de funciones debe tener WHERE, o estar
// precedida por un comentario "-- seguro:" que explique por qué conserva los
// valores válidos (para que nadie agregue algo que vacíe datos al re-ejecutar).
const sinFunciones = schema.replace(/create or replace function[\s\S]*?\$\$[\s\S]*?\$\$/gi, "");
const sentencias = sinFunciones.replace(/\$\$[\s\S]*?\$\$/g, (b) => b.replace(/;/g, " ")).split(";");
for (const s of sentencias) {
  const lineas = s.split("\n");
  const codigo = lineas.filter((l) => !/^\s*--/.test(l)).join("\n").trim();
  if (!/^(update|delete)\b/i.test(codigo)) continue;
  const marcado = lineas.some((l) => /^\s*--\s*seguro:/i.test(l));
  if (!/\bwhere\b/i.test(codigo) && !marcado) error(`schema.sql: instrucción sin WHERE que modifica TODAS las filas cada vez que se ejecuta:\n    ${codigo.split("\n")[0]}`);
  if (/=\s*null\b/i.test(codigo) && !marcado) error(`schema.sql: instrucción que vacía datos ("= null"):\n    ${codigo.split("\n")[0]}`);
}

// ---------- Resultado ----------
const resumen = `${camposUI.size} campos en pantalla · ${camposGE.size} de grupo electrógeno · ${todosEstandar.size} del resto de equipos · ${clavesPayload.size} datos generales`;
if (errores.length) {
  console.error(`\n✗ Verificación de datos FALLÓ (${errores.length} problema${errores.length === 1 ? "" : "s"}). No se publica esta versión:\n`);
  for (const e of errores) console.error("  • " + e);
  console.error("");
  process.exit(1);
}
console.log(`✓ Verificación de datos: todo campo de pantalla llega a la base y al PDF; schema.sql no vacía datos (${resumen}).`);
