import { db } from "./db";
import { supabase } from "./supabase";
import { cargarAnexa, cargarAnexaGE, valoresVacios } from "./informes";
import type { InformeGeneral, TipoEquipo } from "./types";

const BUCKET = "informe-archivos";
const BACKOFF_INICIAL = 5000;
const BACKOFF_MAX = 300000;

let backoff = BACKOFF_INICIAL;
let timer: ReturnType<typeof setTimeout> | null = null;
let corriendo = false;

export function tablaAnexa(tipo: TipoEquipo): string | null {
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
    if (typeof window !== "undefined") window.dispatchEvent(new Event("verdu-sync"));
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
      const registro = await db.blobs.get(archivo.id);
      if (!registro) {
        await db.archivos.update(archivo.id, { estado_sync: "sincronizado" });
        continue;
      }
      await db.archivos.update(archivo.id, { estado_sync: "subiendo" });
      const path = `${informe.id}/${archivo.id}`;
      const blob = registro.blob;
      await conReintentos(4, async () => {
        const { error } = await supabase()
          .storage.from(BUCKET)
          .upload(path, blob, {
            upsert: true,
            contentType: blob.type || "image/jpeg",
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
    if (tabla && informe.tipo_equipo !== "grupo_electrogeno") {
      const anexa = await cargarAnexa(informe.tipo_equipo, informe.id);
      const valores = { ...valoresVacios(), ...anexa };
      const out: Record<string, unknown> = { informe_id: informe.id };
      for (const campo of [
        "horometro", "aceite_motor", "aceite_unidad", "refrig_radiador", "estado_bateria",
        "conec_purga", "inst_electrica", "carroceria", "jabalina", "aislacion_suelo",
        "rpm_min", "rpm_max", "tension_linea_f1", "tension_linea_f2", "tension_linea_f3",
        "tension_gen_f1", "tension_gen_f2", "tension_gen_f3", "cons_carga_f1", "cons_carga_f2",
        "cons_carga_f3", "cons_descarga_f1", "cons_descarga_f2", "cons_descarga_f3",
        "temp_ambiente", "temp_refrigerante", "presion_unidad_comp", "presion_aceite_motor",
        "circuito_refr_m", "circuito_despresuriz", "circuito_arranque", "circuito_seguridad",
        "circuito_electr", "tiempo_y_delta", "diferencial",
        "perdida_aceite_motor", "perdida_refrigerante", "perdida_aire", "perdida_combustible",
      ] as const) {
        if (campo in valores) out[campo] = (valores as Record<string, unknown>)[campo];
      }
      await conReintentos(3, async () => {
        const { error: e2 } = await supabase().from(tabla).upsert(out);
        if (e2) throw e2;
      }).catch((e) => {
        throw new Error(`Guardado de valores técnicos (${mensajeDe(e)})`);
      });
    }

    if (tabla && informe.tipo_equipo === "grupo_electrogeno") {
      const ge = await cargarAnexaGE(informe.id);
      if (ge) {
        const { informe_id: _id, ...campos } = ge;
        const out: Record<string, unknown> = { informe_id: informe.id, ...campos };
        await conReintentos(3, async () => {
          const { error: e2 } = await supabase().from(tabla).upsert(out);
          if (e2) throw e2;
        }).catch((e) => {
          throw new Error(`Guardado de valores grupo electrógeno (${mensajeDe(e)})`);
        });
      }
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

    const idsLocales = new Set(archivosOk.map((a) => a.id));
    const { data: archRemotos } = await supabase()
      .from("informe_archivos")
      .select("id")
      .eq("informe_id", informe.id);
    if (archRemotos) {
      const aBorrar = archRemotos.filter((r) => !idsLocales.has(r.id));
      if (aBorrar.length > 0) {
        const idsBorrar = aBorrar.map((r) => r.id);
        await supabase().from("informe_archivos").delete().in("id", idsBorrar);
        for (const rid of idsBorrar) {
          await supabase().storage.from(BUCKET).remove([`${informe.id}/${rid}`]).catch(() => {});
        }
      }
    }

    await db.informes.update(informe.id, {
      estado_sync: "sincronizado",
      sincronizado_en: new Date().toISOString(),
      numero_registro: data.numero_registro ?? informe.numero_registro,
      firma_tecnico_url: firmaTecnico,
      firma_cliente_url: firmaCliente,
    });

    await db.transaction(
      "rw",
      [db.informes, db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_grupo_electrogeno, db.archivos, db.blobs],
      async () => {
        await db.valores_motocompresor.delete(informe.id);
        await db.valores_compresor.delete(informe.id);
        await db.valores_vehiculos.delete(informe.id);
        await db.valores_grupo_electrogeno.delete(informe.id);
        const archLocal = await db.archivos.where("informe_id").equals(informe.id).toArray();
        for (const a of archLocal) {
          await db.blobs.delete(a.id);
        }
        await db.archivos.where("informe_id").equals(informe.id).delete();
        await db.informes.delete(informe.id);
      }
    );
  } catch (e) {
    const mensaje = mensajeDe(e);
    console.error(`Sync ${informe.id}:`, mensaje);
    await db.informes.update(informe.id, { estado_sync: "error", error_sync: mensaje });
    throw e;
  }
}
