// Revisión de salud de los datos: llama a public.revisar_salud_datos (solo
// lectura) y deja un informe en Markdown. Lo corre la tarea diaria de GitHub
// (.github/workflows/salud-datos.yml), que abre un aviso si hay hallazgos.
// Uso: SUPABASE_URL=... SUPABASE_SALUD_KEY=... [DESDE=2000-01-01] node scripts/salud-datos.mjs informe.md
import fs from "node:fs";

const [salida] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const clave = process.env.SUPABASE_SALUD_KEY;
const desde = process.env.DESDE?.trim() || null;
if (!salida || !url || !clave) {
  console.error("Faltan datos: archivo de salida, SUPABASE_URL o SUPABASE_SALUD_KEY.");
  process.exit(2);
}

const respuesta = await fetch(`${url}/rest/v1/rpc/revisar_salud_datos`, {
  method: "POST",
  headers: { apikey: clave, Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
  body: JSON.stringify(desde ? { p_desde: desde } : {}),
});
if (!respuesta.ok) {
  // La tarea falla y GitHub avisa por mail: la revisión no se pudo hacer.
  console.error(`No se pudo correr la revisión (HTTP ${respuesta.status}): ${await respuesta.text()}`);
  process.exit(2);
}
const hallazgos = await respuesta.json();

const alcance = desde ? `informes cambiados desde ${desde}` : "informes cambiados en las últimas 36 horas";
const celda = (v) => String(v ?? "—").replace(/\|/g, "/").replace(/\n/g, " ");
const lineas = [
  `La revisión automática encontró **${hallazgos.length}** ${hallazgos.length === 1 ? "problema" : "problemas"} en los ${alcance}.`,
  "",
  "| N.º | Cliente | Problema | Detalle | Id del informe |",
  "| --- | --- | --- | --- | --- |",
  ...hallazgos.map((h) => `| ${h.numero ?? "—"} | ${celda(h.cliente)} | ${celda(h.problema)} | ${celda(h.detalle)} | \`${h.informe_id}\` |`),
  "",
  "La revisión es de solo lectura: no modificó nada. Antes de corregir un dato, revisarlo con una consulta en el SQL Editor.",
];
if (process.env.AVISAR_A) lineas.push("", `@${process.env.AVISAR_A}`);
fs.writeFileSync(salida, lineas.join("\n") + "\n");

if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `cantidad=${hallazgos.length}\n`);
console.log(`Hallazgos: ${hallazgos.length}`);
