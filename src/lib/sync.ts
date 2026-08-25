import { db } from "./db";
import { supabase } from "./supabase";
import { CAMPOS_POR_TIPO, cargarAnexa, valoresVacios } from "./informes";
import type { InformeGeneral, TipoEquipo } from "./types";

const BUCKET = "informe-archivos";
const BACKOFF_INICIAL = 5000;
const BACKOFF_MAX = 300000;

let backoff = BACKOFF_INICIAL;
let timer: ReturnType<typeof setTimeout> | null = null;
let corriendo = false;

function tablaAnexa(tipo: TipoEquipo): string | null {
  switch (tipo) {
    case "motocompresor":
      return "informes_motocompresor";
    case "compresor":
      return "informes_compresor";
    case "vehiculos":
      return "informes_vehiculos";
    case "grupo_electrogeno":
      return "informes_grupo_electrogeno";
    default:
      return null;
  }
}

async function conSesion(): Promise<boolean> {
  const { data } = await supabase().auth.getSession();
  return Boolean(data.session);
}

async function hayConexion(): Promise<boolean> {
  try {
    const { error } = await supabase()
      .from("clientes")
      .select("id", { head: true });
    return !error;
  } catch {
    return false;
  }
}

async function conReintentos<T>(intentos: number, operacion: () => Promise<T>): Promise<T> {
  let ultimo: unknown = null;
  for (let i = 0; i < intentos; i++) {
    try {
      return await operacion();
    } catch (e) {
      ultimo = e;
      if (i < intentos - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw ultimo;
}

function mensajeDe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) return String((e as { message: unknown }).message);
  return "Error desconocido";
}

function programarReintento() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    intentarSync();
  }, backoff);
  backoff = Math.min(backoff * 2, BACKOFF_MAX);
}

export function intentarSync() {
  void (async () => {
    if (corriendo) return;
    if (!(await conSesion())) return;
    if (!(await hayConexion())) {
      programarReintento();
      return;
    }
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (locks) {
      await locks.request("sync-informes", { ifAvailable: true }, async (lock) => {
        if (!lock) return;
        await ejecutar();
      });
    } else {
      await ejecutar();
    }
  })();
}

async function ejecutar() {
  corriendo = true;
  let huboError = false;
  try {
    const pendientes = await db.informes
      .filter((i) => i.estado_sync !== "sincronizado")
      .toArray();
    pendientes.sort((a, b) => a.creado_en.localeCompare(b.creado_en));
    for (const informe of pendientes) {
      try {
        await sincronizarInforme(informe);
      } catch {
        huboError = true;
      }
    }
    if (huboError) {
      programarReintento();
    } else {
      backoff = BACKOFF_INICIAL;
    }
  } finally {
    corriendo = false;
  }
}

async function sincronizarInforme(informeOriginal: InformeGeneral) {
  let informe = informeOriginal;
  try {
    if (!informe.tecnico_id) {
      const { data } = await supabase().auth.getSession();
      const uid = data.session?.user.id ?? null;
      if (!uid) throw new Error("Informe sin técnico asignado; iniciá sesión.");
      informe = { ...informe, tecnico_id: uid };
      await db.informes.update(informe.id, { tecnico_id: uid });
    }
    await db.informes.update(informe.id, { estado_sync: "subiendo_imagenes", error_sync: null });
    const archivos = await db.archivos.where("informe_id").equals(informe.id).toArray();
    for (const archivo of archivos) {
      if (archivo.url) {
        await db.archivos.update(archivo.id, { estado_sync: "sincronizado" });
        continue;
      }
      await db.archivos.update(archivo.id, { estado_sync: "subiendo" });
      const path = `${informe.id}/${archivo.id}`;
      await conReintentos(3, async () => {
        const { error } = await supabase()
          .storage.from(BUCKET)
          .upload(path, archivo.blob, {
            upsert: true,
            contentType: archivo.blob.type || "application/octet-stream",
          });
        if (error) throw error;
      }).catch((e) => {
        throw new Error(`Subida de imagen (${mensajeDe(e)})`);
      });
      await db.archivos.update(archivo.id, { url: path, estado_sync: "sincronizado" });
    }
    await db.informes.update(informe.id, { estado_sync: "imagenes_ok" });

    const archivosOk = await db.archivos.where("informe_id").equals(informe.id).toArray();
    const firmaTecnico =
      archivosOk.find((a) => a.tipo === "firma_tecnico")?.url ?? informe.firma_tecnico_url;
    const firmaCliente =
      archivosOk.find((a) => a.tipo === "firma_cliente")?.url ?? informe.firma_cliente_url;

    const payload = {
      id: informe.id,
      cliente_id: informe.cliente_id,
      cliente_nombre: informe.cliente_nombre,
      cliente_telefono: informe.cliente_telefono,
      cliente_direccion: informe.cliente_direccion,
      tecnico_id: informe.tecnico_id,
      fecha_hora: informe.fecha_hora,
      tipo_equipo: informe.tipo_equipo,
      observaciones: informe.observaciones,
      observaciones_ia: informe.observaciones_ia,
      maquina_operativa: informe.maquina_operativa,
      horas_trabajadas: informe.horas_trabajadas,
      repuestos_air_power: informe.repuestos_air_power,
      repuestos_cliente: informe.repuestos_cliente,
      requiere_cotizacion: informe.requiere_cotizacion,
      cotizacion_notas: informe.cotizacion_notas,
      cotizacion_notas_ia: informe.cotizacion_notas_ia,
      estado_firma: informe.estado_firma,
      cerrado: informe.cerrado,
      firma_tecnico_url: firmaTecnico,
      firma_cliente_url: firmaCliente,
      aclaracion_firma: informe.aclaracion_firma,
      firmado_en: informe.firmado_en,
      creado_en: informe.creado_en,
      actualizado_en: new Date().toISOString(),
      sincronizado_en: new Date().toISOString(),
    };
    const data = await conReintentos(3, async () => {
      const { data: fila, error } = await supabase()
        .from("informes_generales")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return fila;
    }).catch((e) => {
      throw new Error(`Guardado del informe en servidor (${mensajeDe(e)})`);
    });

    const tabla = tablaAnexa(informe.tipo_equipo);
    if (tabla) {
      const anexa = await cargarAnexa(informe.tipo_equipo, informe.id);
      const valores = { ...valoresVacios(), ...anexa };
      const out: Record<string, unknown> = { informe_id: informe.id };
      for (const campo of CAMPOS_POR_TIPO[informe.tipo_equipo]) out[campo] = valores[campo];
      await conReintentos(3, async () => {
        const { error: e2 } = await supabase().from(tabla).upsert(out);
        if (e2) throw e2;
      }).catch((e) => {
        throw new Error(`Guardado de valores técnicos (${mensajeDe(e)})`);
      });
    }

    const filasArchivos = archivosOk
      .filter((a) => a.url)
      .map((a) => ({
        id: a.id,
        informe_id: informe.id,
        tipo: a.tipo,
        categoria: a.categoria,
        url: a.url,
      }));
    if (filasArchivos.length > 0) {
      await conReintentos(3, async () => {
        const { error: e3 } = await supabase().from("informe_archivos").upsert(filasArchivos);
        if (e3) throw e3;
      }).catch((e) => {
        throw new Error(`Guardado de archivos en servidor (${mensajeDe(e)})`);
      });
    }

    await db.informes.update(informe.id, {
      estado_sync: "sincronizado",
      sincronizado_en: new Date().toISOString(),
      numero_registro: data.numero_registro ?? informe.numero_registro,
      firma_tecnico_url: firmaTecnico,
      firma_cliente_url: firmaCliente,
    });
  } catch (e) {
    const mensaje = mensajeDe(e);
    console.error(`Sync ${informe.id}:`, mensaje);
    await db.informes.update(informe.id, { estado_sync: "error", error_sync: mensaje });
    throw e;
  }
}
