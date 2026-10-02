import { db } from "./db";
import { supabase } from "./supabase";
import { CAMPOS_GE, cargarAnexa, cargarAnexaGE, construirAnexa, normalizarValores } from "./informes";
import { estadoSesionActual, pedirVerificacionSesion } from "./reautenticacion";
import type { ArchivoLocal, InformeGeneral, TipoEquipo, ValoresBase } from "./types";

const BUCKET = "informe-archivos";
const BACKOFF_INICIAL = 5000;
const BACKOFF_MAX = 300000;

let backoff = BACKOFF_INICIAL;

/**
 * Agrega un poco de azar (±25 %) a una espera. Así, cuando el servidor vuelve
 * después de un corte, los celulares no reintentan todos en el mismo instante.
 */
function conVariacion(ms: number): number {
  return Math.round(ms * (0.75 + Math.random() * 0.5));
}
let timer: ReturnType<typeof setTimeout> | null = null;
let corriendo = false;
let syncEnCurso: Promise<boolean> | null = null;
const informesEnEdicion = new Set<string>();
// Liberadores de los Web Locks "editar-informe-<id>" que toma esta pestaña. El
// Set de arriba solo lo ve esta pestaña; el lock lo ven todas (otra pestaña con
// el mismo informe abierto en el editor también frena la sincronización).
const liberadoresEdicion = new Map<string, () => void>();

function nombreLockEdicion(id: string): string {
  return `editar-informe-${id}`;
}

function locksDisponibles(): LockManager | undefined {
  return typeof navigator !== "undefined" ? navigator.locks : undefined;
}

export function bloquearInformeSync(id: string): void {
  informesEnEdicion.add(id);
  if (liberadoresEdicion.has(id)) return;
  const locks = locksDisponibles();
  if (!locks) return;
  let liberar: () => void = () => undefined;
  const hastaDesbloquear = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  // Si el lock todavía está en espera (otra pestaña lo tiene) y se desbloquea,
  // se aborta el pedido para que no quede tomado después.
  const control = new AbortController();
  liberadoresEdicion.set(id, () => {
    liberar();
    control.abort();
  });
  try {
    locks
      .request(nombreLockEdicion(id), { signal: control.signal }, () => hastaDesbloquear)
      .catch(() => undefined);
  } catch {
    // Sin Web Locks utilizables: alcanza con el Set local.
  }
}

export function desbloquearInformeSync(id: string): void {
  informesEnEdicion.delete(id);
  const liberar = liberadoresEdicion.get(id);
  if (!liberar) return;
  liberadoresEdicion.delete(id);
  liberar();
  // Al cerrar el editor se intenta subir lo pendiente (si se salteó mientras
  // estaba abierto). Se espera un momento a que termine el guardado del editor.
  if (typeof window !== "undefined") window.setTimeout(() => void intentarSync(), 1500);
}

// Un informe está en edición si esta pestaña lo tiene abierto en el editor o si
// alguna otra pestaña tiene tomado su lock de edición.
async function enEdicion(id: string): Promise<boolean> {
  if (informesEnEdicion.has(id)) return true;
  const locks = locksDisponibles();
  if (!locks) return false;
  try {
    const estado = await locks.query();
    const nombre = nombreLockEdicion(id);
    return (estado.held ?? []).some((l) => l.name === nombre);
  } catch {
    return informesEnEdicion.has(id);
  }
}

export function tablaAnexa(tipo: TipoEquipo): string | null {
  switch (tipo) {
    case "motocompresor":
      return "informes_motocompresor";
    case "compresor":
      return "informes_compresor";
    case "vehiculos":
    case "maquinas_viales":
      return "informes_vehiculos";
    case "secadores":
      return "informes_secadores";
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

// El número de un informe NUEVO no se pide por adelantado: lo asigna el servidor
// dentro de la misma transacción que lo guarda (sincronizar_informe_completo),
// así un fallo en el medio nunca deja un número salteado. Acá solo se conserva
// el número si el informe ya lo tenía.
function numeroExistente(informe: InformeGeneral): number | null {
  return informe.numero_registro ?? null;
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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Conexión perdida; la sincronización quedó pendiente.");
    }
    try {
      return await operacion();
    } catch (e) {
      ultimo = e;
      if (i < intentos - 1) await new Promise((r) => setTimeout(r, conVariacion(1500 * (i + 1))));
    }
  }
  throw ultimo;
}

async function exigirConexion(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Conexión perdida; la sincronización quedó pendiente.");
  }
  if (!(await hayConexion())) {
    throw new Error("No hay conexión estable; la sincronización quedó pendiente.");
  }
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
  }, conVariacion(backoff));
  backoff = Math.min(backoff * 2, BACKOFF_MAX);
}

export function intentarSync(): Promise<boolean> {
  if (syncEnCurso) return syncEnCurso;
  syncEnCurso = (async () => {
    if (corriendo) return true;
    // Con la sesión vencida no se intenta subir: los informes esperan al
    // re-ingreso en lugar de quedar marcados con error.
    if (estadoSesionActual() === "vencida") return false;
    if (!(await conSesion())) return false;
    if (!(await hayConexion())) {
      programarReintento();
      return false;
    }
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (locks) {
      return await locks.request("sync-informes", { ifAvailable: true }, async (lock) => {
        if (!lock) return false;
        return await ejecutar();
      });
    } else {
      return await ejecutar();
    }
  })().catch((error) => {
    console.error("[sync] error inesperado:", error);
    return false;
  }).finally(() => {
    syncEnCurso = null;
  });
  return syncEnCurso;
}

async function ejecutar(): Promise<boolean> {
  corriendo = true;
  let huboError = false;
  try {
    const pendientes = await db.informes
      .filter((i) => i.estado_sync !== "sincronizado")
      .toArray();
    pendientes.sort((a, b) => a.creado_en.localeCompare(b.creado_en));
    let huboSalteado = false;
    for (const informe of pendientes) {
      if (!informe.listo_para_enviar) continue;
      // Abierto en el editor (en esta u otra pestaña): se reintenta más tarde.
      if (await enEdicion(informe.id)) {
        huboSalteado = true;
        continue;
      }
      try {
        await sincronizarInforme(informe);
      } catch {
        huboError = true;
      }
    }
    if (huboError || huboSalteado) {
      programarReintento();
    } else {
      backoff = BACKOFF_INICIAL;
    }
  } finally {
    corriendo = false;
    if (typeof window !== "undefined") window.dispatchEvent(new Event("verdu-sync"));
  }
  return !huboError;
}

// Mensaje para el técnico cuando se perdió la imagen guardada en el celular.
function mensajeArchivoPerdido(tipo: ArchivoLocal["tipo"]): string {
  if (tipo === "firma_cliente") {
    return "Se perdió la firma del cliente. Volvé a pedirle la firma y enviá el informe de nuevo.";
  }
  if (tipo === "firma_tecnico") {
    return "Se perdió la firma del técnico. Volvé a firmar y enviá el informe de nuevo.";
  }
  return "Se perdió una foto guardada en el celular. Volvé a sacarla y enviá el informe de nuevo.";
}

// Un archivo sin subir cuya imagen ya no está en el celular no se puede enviar
// nunca: se descarta y el informe vuelve a borrador para que el técnico la
// reponga, en lugar de quedar trabado con error en cada intento.
// Devuelve false si el archivo ya no existía (lo reemplazó o borró el editor).
async function descartarArchivoPerdido(informeId: string, archivo: ArchivoLocal): Promise<boolean> {
  return await db.transaction("rw", [db.informes, db.archivos, db.blobs], async () => {
    const actual = await db.archivos.get(archivo.id);
    if (!actual) return false;
    if (actual.url || (await db.blobs.get(archivo.id))) return false;
    await db.archivos.delete(archivo.id);
    const cambios: Partial<InformeGeneral> = {
      listo_para_enviar: false,
      estado_sync: "pendiente",
      error_sync: mensajeArchivoPerdido(actual.tipo),
    };
    if (actual.tipo === "firma_cliente") {
      cambios.estado_firma = "pendiente";
      cambios.firmado_en = null;
      cambios.cerrado = false;
    }
    await db.informes.update(informeId, cambios);
    return true;
  });
}

async function sincronizarInforme(informeOriginal: InformeGeneral) {
  // Se relee el informe: la lista de pendientes pudo quedar vieja.
  const fresco = await db.informes.get(informeOriginal.id);
  if (!fresco) return;
  let informe = fresco;
  if (!informe.listo_para_enviar) return;
  if (await enEdicion(informe.id)) return;
  // Versión local que se envía: si cambia durante la subida, al terminar no se
  // borra nada local (los cambios nuevos quedan para el próximo envío).
  const actualizadoEnviado = informe.actualizado_en;
  let archivosIniciales: ArchivoLocal[] = [];
  try {
    await exigirConexion();
    if (!informe.tecnico_id) {
      const { data } = await supabase().auth.getSession();
      const uid = data.session?.user.id ?? null;
      if (!uid) throw new Error("Informe sin técnico asignado; iniciá sesión.");
      informe = { ...informe, tecnico_id: uid };
      await db.informes.update(informe.id, { tecnico_id: uid });
    }
    informe = { ...informe, numero_registro: numeroExistente(informe) };
    await db.informes.update(informe.id, { estado_sync: "subiendo_imagenes", error_sync: null });
    const archivos = await db.archivos.where("informe_id").equals(informe.id).toArray();
    archivosIniciales = archivos;
    // Nunca se borran del servidor archivos de un intento anterior: si ese
    // intento llegó a guardarse (y se perdió la respuesta), esos archivos ya
    // forman parte del informe. Cada archivo se sube siempre a la misma ruta y
    // reemplaza lo que hubiera, así que reintentar no deja copias.
    for (const archivo of archivos) {
      if (archivo.url) {
        await db.archivos.update(archivo.id, { estado_sync: "sincronizado" });
        continue;
      }
      await exigirConexion();
      const registro = await db.blobs.get(archivo.id);
      if (!registro) {
        if (await descartarArchivoPerdido(informe.id, archivo)) {
          console.error(`Sync ${informe.id}: falta la imagen local del archivo ${archivo.id}; el informe volvió a borrador.`);
          return;
        }
        // El editor reemplazó o borró este archivo mientras tanto: se sigue
        // con el resto y la comparación final decide qué se conserva.
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
    await exigirConexion();
    await db.informes.update(informe.id, { estado_sync: "imagenes_ok" });

    const archivosOk = await db.archivos.where("informe_id").equals(informe.id).toArray();
    const firmaTecnico =
      archivosOk.find((a) => a.tipo === "firma_tecnico")?.url ?? null;
    const firmaCliente =
      archivosOk.find((a) => a.tipo === "firma_cliente")?.url ?? null;

    const payload = {
      id: informe.id,
      numero_registro: informe.numero_registro,
      cliente_id: informe.cliente_id,
      cliente_nombre: informe.cliente_nombre,
      cliente_telefono: informe.cliente_telefono,
      cliente_direccion: informe.cliente_direccion,
      modelo: informe.modelo ?? null,
      numero_serie: informe.numero_serie ?? null,
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
      listo_para_enviar: true,
      firma_tecnico_url: firmaTecnico,
      firma_cliente_url: firmaCliente,
      aclaracion_firma: informe.aclaracion_firma,
      firmado_en: informe.firmado_en,
      creado_en: informe.creado_en,
      actualizado_en: new Date().toISOString(),
      sincronizado_en: new Date().toISOString(),
    };
    const tabla = tablaAnexa(informe.tipo_equipo);
    let valoresTecnicos: Record<string, unknown> | null = null;
    if (tabla && informe.tipo_equipo !== "grupo_electrogeno") {
      const anexa = await cargarAnexa(informe.tipo_equipo, informe.id);
      valoresTecnicos = construirAnexa(informe.tipo_equipo, informe.id, anexa as ValoresBase);
    }

    if (tabla && informe.tipo_equipo === "grupo_electrogeno") {
      const ge = await cargarAnexaGE(informe.id);
      if (ge) {
        normalizarValores("grupo_electrogeno", ge as unknown as Record<string, unknown>);
        valoresTecnicos = { informe_id: informe.id };
        for (const campo of CAMPOS_GE) valoresTecnicos[campo] = ge[campo];
      }
    }

    const filasArchivos: Record<string, unknown>[] = archivosOk
      .filter((a) => a.url)
      .map((a) => ({
        id: a.id,
        informe_id: informe.id,
        tipo: a.tipo,
        categoria: a.categoria,
        url: a.url,
      }));
    // Fotos ya subidas que el usuario eliminó: el servidor borra solo éstas.
    const eliminados = await db.eliminados.where("informe_id").equals(informe.id).toArray();
    for (const e of eliminados) {
      filasArchivos.push({ id: e.id, informe_id: informe.id, tipo: "foto", categoria: e.categoria ?? null, url: e.url, eliminado: true });
    }
    const data = await conReintentos(3, async () => {
      const respuesta = await supabase().rpc("sincronizar_informe_completo", {
        p_informe: payload,
        p_valores: valoresTecnicos,
        p_archivos: filasArchivos,
      });
      if (respuesta.error) throw respuesta.error;
      return (respuesta.data ?? {}) as { numero_registro?: number | null };
    }).catch((e) => {
      throw new Error(`Guardado transaccional del informe (${mensajeDe(e)})`);
    });

    const numeroFinal = data.numero_registro ?? informe.numero_registro;
    const sincronizadoEn = new Date().toISOString();
    const idsEnviados = new Set(archivosOk.filter((a) => a.url).map((a) => a.id));
    const idsEliminadosEnviados = eliminados.map((e) => e.id);
    const firmaTecnicoId = archivosOk.find((a) => a.tipo === "firma_tecnico" && a.url)?.id ?? null;
    const firmaClienteId = archivosOk.find((a) => a.tipo === "firma_cliente" && a.url)?.id ?? null;
    // El lock de otra pestaña no se puede consultar dentro de la transacción de
    // Dexie (se cerraría); el Set local se vuelve a mirar adentro.
    const editandoAhora = await enEdicion(informe.id);

    let quedoPendiente = false;
    await db.transaction(
      "rw",
      [db.informes, db.valores_motocompresor, db.valores_compresor, db.valores_vehiculos, db.valores_secadores, db.valores_grupo_electrogeno, db.archivos, db.blobs, db.eliminados],
      async () => {
        await db.eliminados.bulkDelete(idsEliminadosEnviados);
        const local = await db.informes.get(informe.id);
        if (!local) return;
        const archLocal = await db.archivos.where("informe_id").equals(informe.id).toArray();
        const eliminadosLocal = await db.eliminados.where("informe_id").equals(informe.id).count();
        const sinCambios =
          !editandoAhora &&
          !informesEnEdicion.has(informe.id) &&
          local.actualizado_en === actualizadoEnviado &&
          local.listo_para_enviar &&
          eliminadosLocal === 0 &&
          archLocal.length === idsEnviados.size &&
          archLocal.every((a) => idsEnviados.has(a.id));

        if (sinCambios) {
          await db.valores_motocompresor.delete(informe.id);
          await db.valores_compresor.delete(informe.id);
          await db.valores_vehiculos.delete(informe.id);
          await db.valores_secadores.delete(informe.id);
          await db.valores_grupo_electrogeno.delete(informe.id);
          for (const a of archLocal) {
            await db.blobs.delete(a.id);
          }
          await db.archivos.where("informe_id").equals(informe.id).delete();
          await db.informes.delete(informe.id);
          return;
        }

        // Hubo cambios locales durante la subida: se conserva todo como
        // pendiente y solo se guarda lo que el servidor ya confirmó.
        const cambios: Partial<InformeGeneral> = {
          estado_sync: "pendiente",
          error_sync: null,
          sincronizado_en: sincronizadoEn,
          numero_registro: numeroFinal ?? local.numero_registro,
          // Lo que quedó en el servidor es este envío: no es un cambio de otra persona.
          base_servidor_en: payload.actualizado_en,
        };
        const idsLocales = new Set(archLocal.map((a) => a.id));
        if (firmaTecnicoId && idsLocales.has(firmaTecnicoId)) cambios.firma_tecnico_url = firmaTecnico;
        if (firmaClienteId && idsLocales.has(firmaClienteId)) cambios.firma_cliente_url = firmaCliente;
        await db.informes.update(informe.id, cambios);
        quedoPendiente = local.listo_para_enviar && !editandoAhora && !informesEnEdicion.has(informe.id);
      }
    );
    // Los cambios nuevos ya marcados para enviar se suben en un próximo intento.
    if (quedoPendiente) programarReintento();
  } catch (e) {
    const mensaje = mensajeDe(e);
    console.error(`Sync ${informe.id}:`, mensaje);
    if (/jwt|token|not authorized|unauthorized|401|permission denied|row-level security/i.test(mensaje)) {
      pedirVerificacionSesion();
    }
    const archivosParaResetear = archivosIniciales.filter((archivo) => !archivo.url);
    await db.transaction("rw", [db.informes, db.archivos], async () => {
      for (const archivo of archivosParaResetear) {
        await db.archivos.update(archivo.id, { url: null, estado_sync: "pendiente" });
      }
      await db.informes.update(informe.id, {
        estado_sync: "error",
        error_sync: mensaje,
      });
    });
    throw e;
  }
}
