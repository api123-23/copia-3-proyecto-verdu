import { db, prepararBlob } from "./db";
import { supabase } from "./supabase";
import { normalizarValores } from "./informes";
import { tablaAnexa } from "./sync";
import type { CategoriaFoto, InformeGeneral, InformeGrupoElectrogeno, TipoEquipo, ValoresBase } from "./types";

const BUCKET = "informe-archivos";

type FilaServidor = Record<string, unknown>;

function normalizar(f: FilaServidor): InformeGeneral {
  return {
    id: String(f.id),
    numero_registro: (f.numero_registro as number) ?? null,
    cliente_id: (f.cliente_id as string) ?? null,
    cliente_nombre: String(f.cliente_nombre ?? ""),
    cliente_telefono: (f.cliente_telefono as string) ?? null,
    cliente_direccion: (f.cliente_direccion as string) ?? null,
    modelo: (f.modelo as string) ?? null,
    numero_serie: (f.numero_serie as string) ?? null,
    tecnico_id: (f.tecnico_id as string) ?? null,
    fecha_hora: String(f.fecha_hora),
    tipo_equipo: f.tipo_equipo as TipoEquipo,
    observaciones: (f.observaciones as string) ?? null,
    observaciones_ia: (f.observaciones_ia as string) ?? null,
    maquina_operativa: (f.maquina_operativa as boolean) ?? null,
    horas_trabajadas: (f.horas_trabajadas as number) ?? null,
    repuestos_air_power: (f.repuestos_air_power as string) ?? null,
    repuestos_cliente: (f.repuestos_cliente as string) ?? null,
    requiere_cotizacion: Boolean(f.requiere_cotizacion),
    cotizacion_notas: (f.cotizacion_notas as string) ?? null,
    cotizacion_notas_ia: (f.cotizacion_notas_ia as string) ?? null,
    estado_firma: (f.estado_firma as "pendiente" | "firmado") ?? "pendiente",
    cerrado: Boolean(f.cerrado),
    firma_tecnico_url: (f.firma_tecnico_url as string) ?? null,
    firma_cliente_url: (f.firma_cliente_url as string) ?? null,
    aclaracion_firma: (f.aclaracion_firma as string) ?? null,
    firmado_en: (f.firmado_en as string) ?? null,
    creado_en: String(f.creado_en),
    actualizado_en: String(f.actualizado_en),
    sincronizado_en: (f.sincronizado_en as string) ?? null,
    base_servidor_en: (f.actualizado_en as string) ?? null,
    estado_sync: "sincronizado",
    listo_para_enviar: true,
    error_sync: null,
  };
}

// ---- Listado paginado (pantalla principal) ----

export const INFORMES_POR_PAGINA = 30;

/** Filtros del listado; se aplican en el servidor sobre TODOS los informes. */
export type FiltrosListado = {
  /** Número exacto (ver numeroDeFiltro). null: sin filtro. */
  numero: number | null;
  /** Día "AAAA-MM-DD" en hora argentina. "": sin filtro. */
  fecha: string;
  cliente: string;
  tecnicoId: string;
  tipoEquipo: string;
};

export type PaginaRemota = { informes: InformeGeneral[]; total: number };

// Solo lo que muestra la lista (tabla de PC y tarjetas). La descarga y la vista
// PDF traen el informe completo aparte (traerInformeRemoto). Estas filas son un
// resumen: NUNCA se guardan en el celular.
const COLUMNAS_LISTADO =
  "id, numero_registro, cliente_nombre, tecnico_id, fecha_hora, tipo_equipo, estado_firma, creado_en, actualizado_en";

const NUMERO_MAXIMO = 2147483647; // numero_registro es int

/** "000123", "№ 123" → 123. null: sin filtro (vacío o solo ceros).
 *  -1: un número que no puede existir (no trae nada). */
export function numeroDeFiltro(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return null;
  const n = Number(digitos);
  return digitos.length > 10 || n > NUMERO_MAXIMO ? -1 : n;
}

const MS_DIA = 24 * 60 * 60 * 1000;
const DESFASE_ARGENTINA_MS = 3 * 60 * 60 * 1000; // America/Argentina/Cordoba: UTC-3 todo el año

/** Rango [inicio, fin) en UTC del día "AAAA-MM-DD" en hora argentina. */
export function rangoDiaArgentina(fecha: string): [string, string] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const inicio = new Date(`${fecha}T00:00:00-03:00`);
  if (Number.isNaN(inicio.getTime())) return null;
  return [inicio.toISOString(), new Date(inicio.getTime() + MS_DIA).toISOString()];
}

/** Día "AAAA-MM-DD" en hora argentina de un instante ISO. */
export function diaArgentina(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t - DESFASE_ARGENTINA_MS).toISOString().slice(0, 10);
}

function consultaListado(filtros: FiltrosListado, soloContar: boolean) {
  let q = soloContar
    ? supabase().from("informes_generales").select("id", { count: "exact", head: true })
    : supabase().from("informes_generales").select(COLUMNAS_LISTADO, { count: "exact" });
  if (filtros.numero !== null) q = q.eq("numero_registro", filtros.numero);
  const rango = filtros.fecha ? rangoDiaArgentina(filtros.fecha) : null;
  if (rango) q = q.gte("fecha_hora", rango[0]).lt("fecha_hora", rango[1]);
  const cliente = filtros.cliente.trim();
  // %, _ y \ se buscan como texto literal.
  if (cliente) q = q.ilike("cliente_nombre", `%${cliente.replace(/[\\%_]/g, "\\$&")}%`);
  if (filtros.tecnicoId) q = q.eq("tecnico_id", filtros.tecnicoId);
  if (filtros.tipoEquipo) q = q.eq("tipo_equipo", filtros.tipoEquipo);
  return q;
}

/** Una página del listado (30 informes) + el total que cumple los filtros.
 *  Mismo orden que la lista: número de registro descendente (sin número al
 *  final), después fecha descendente y el id como desempate estable. Lo que
 *  ve cada usuario lo restringe RLS en el servidor. */
export async function listarRemotos(pagina: number, filtros: FiltrosListado): Promise<PaginaRemota> {
  const desde = (Math.max(1, Math.floor(pagina)) - 1) * INFORMES_POR_PAGINA;
  const { data, error, count } = await consultaListado(filtros, false)
    .order("numero_registro", { ascending: false, nullsFirst: false })
    .order("fecha_hora", { ascending: false })
    .order("id", { ascending: false })
    .range(desde, desde + INFORMES_POR_PAGINA - 1);
  if (error) {
    // Página fuera de rango (p. ej. se borraron informes): se informa el total
    // para que la lista vuelva a una página válida.
    if (error.code === "PGRST103") {
      const { count: total, error: errorTotal } = await consultaListado(filtros, true);
      if (errorTotal) throw errorTotal;
      return { informes: [], total: total ?? 0 };
    }
    throw error;
  }
  if (!data) throw new Error("Supabase no devolvió los informes.");
  const informes = (data as unknown as FilaServidor[]).map(normalizar);
  return { informes, total: count ?? desde + informes.length };
}

export async function traerInformeRemoto(id: string): Promise<boolean> {
  const { data, error } = await supabase()
    .from("informes_generales")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return false;
  const informe = normalizar(data as FilaServidor);

  const tabla = tablaAnexa(informe.tipo_equipo);
  let anexa: Partial<ValoresBase> | null = null;
  let anexaGE: InformeGrupoElectrogeno | null = null;

  // Si alguna parte del informe no se pudo traer, no se abre con datos
  // incompletos: al reenviarlo se pisarían los datos reales del servidor.
  if (tabla && informe.tipo_equipo !== "grupo_electrogeno") {
    const { data: filaAnexa, error: errorAnexa } = await supabase().from(tabla).select("*").eq("informe_id", id).maybeSingle();
    if (errorAnexa) return false;
    if (filaAnexa) {
      const resto = { ...(filaAnexa as FilaServidor) };
      delete resto.informe_id;
      normalizarValores(informe.tipo_equipo, resto);
      anexa = resto as Partial<ValoresBase>;
    }
  }

  if (tabla && informe.tipo_equipo === "grupo_electrogeno") {
    const { data: filaGE, error: errorGE } = await supabase().from(tabla).select("*").eq("informe_id", id).maybeSingle();
    if (errorGE) return false;
    if (filaGE) {
      const resto = { ...(filaGE as FilaServidor) };
      normalizarValores("grupo_electrogeno", resto);
      anexaGE = resto as unknown as InformeGrupoElectrogeno;
    }
  }

  const { data: archivos, error: errorArchivos } = await supabase()
    .from("informe_archivos")
    .select("*")
    .eq("informe_id", id);
  if (errorArchivos || !archivos) return false;

  const archivosMeta = (archivos ?? []) as FilaServidor[];

  await db.transaction(
    "rw",
    [db.informes, db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno, db.archivos, db.eliminados],
    async () => {
      await db.informes.put(informe);
      // Copia fresca del servidor: no aplica ningún borrado de fotos anterior.
      await db.eliminados.where("informe_id").equals(id).delete();
      if (anexa) {
        const destino =
          informe.tipo_equipo === "motocompresor"
            ? db.valores_motocompresor
            : informe.tipo_equipo === "compresor"
              ? db.valores_compresor
              : informe.tipo_equipo === "vehiculos" || informe.tipo_equipo === "maquinas_viales"
                ? db.valores_vehiculos
                : db.valores_secadores;
        await destino.put({ informe_id: id, ...anexa } as never);
      }
      if (anexaGE) {
        await db.valores_grupo_electrogeno.put(anexaGE);
      }
      for (const a of archivosMeta) {
        const idArchivo = String(a.id);
        const existente = await db.archivos.get(idArchivo);
        if (existente) continue;
        await db.archivos.put({
          id: idArchivo,
          informe_id: id,
          tipo: a.tipo as "foto" | "firma_tecnico" | "firma_cliente",
          categoria: (a.categoria as CategoriaFoto | null) ?? null,
          url: String(a.url),
          estado_sync: "sincronizado",
          creado_en: String(a.creado_en),
        });
      }
    }
  );

  for (const a of archivosMeta) {
    const idArchivo = String(a.id);
    const tieneBlob = await db.blobs.get(idArchivo);
    if (tieneBlob) continue;
    try {
      const { data: descargado } = await supabase().storage.from(BUCKET).download(String(a.url));
      if (descargado) await db.blobs.put(await prepararBlob(idArchivo, descargado));
    } catch {
      /* FotoItem usa signed URL como fallback */
    }
  }

  return true;
}

/** actualizado_en del informe en el servidor. null: no existe o este usuario no
 *  puede verlo. undefined: no se pudo consultar (sin señal o tardó demasiado). */
export async function actualizadoEnServidor(id: string): Promise<string | null | undefined> {
  try {
    const consulta = supabase().from("informes_generales").select("actualizado_en").eq("id", id).maybeSingle();
    const resultado = await Promise.race([consulta, new Promise<null>((r) => setTimeout(() => r(null), 5000))]);
    if (!resultado || resultado.error) return undefined;
    return (resultado.data?.actualizado_en as string | undefined) ?? null;
  } catch {
    return undefined;
  }
}

/** Una copia local sin cambios, ¿sigue igual que en el servidor? (undefined: no se sabe). */
export async function copiaLocalVigente(informe: InformeGeneral): Promise<boolean | undefined> {
  const enServidor = await actualizadoEnServidor(informe.id);
  if (enServidor === undefined) return undefined;
  if (enServidor === null) return false;
  return new Date(enServidor).getTime() === new Date(informe.base_servidor_en ?? informe.actualizado_en).getTime();
}

/** Borra la copia local de un informe (solo se usa con copias sin cambios). */
export async function descartarCopiaLocal(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.informes, db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno, db.archivos, db.blobs, db.eliminados],
    async () => {
      const actual = await db.informes.get(id);
      if (actual && actual.estado_sync !== "sincronizado") return; // tiene cambios locales: no se toca
      const archivos = await db.archivos.where("informe_id").equals(id).primaryKeys();
      await db.blobs.bulkDelete(archivos);
      await db.archivos.bulkDelete(archivos);
      await db.eliminados.where("informe_id").equals(id).delete();
      for (const tabla of [db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno]) {
        await tabla.delete(id);
      }
      await db.informes.delete(id);
    }
  );
}

/** Al cerrar sesión: borra del celular las copias de informes ya subidos (lo
 *  que no se subió todavía se conserva para subirlo al volver a ingresar). */
export async function borrarCopiasSincronizadas(): Promise<void> {
  const ids = (await db.informes.filter((i) => i.estado_sync === "sincronizado").primaryKeys()).map(String);
  for (const id of ids) await descartarCopiaLocal(id);
}
