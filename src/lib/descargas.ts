import { useSyncExternalStore } from "react";
import { db, prepararBlob } from "./db";
import { supabase } from "./supabase";

const BUCKET = "informe-archivos";
// De a pocos a la vez: más rápido que de a uno y sin saturar celulares viejos ni 3G.
const EN_PARALELO = 3;

// Archivos que se están bajando ahora (la pantalla los muestra "cargando").
let pendientes = new Set<string>();
const oyentes = new Set<() => void>();

function cambiar(fn: (s: Set<string>) => void) {
  const nuevo = new Set(pendientes);
  fn(nuevo);
  pendientes = nuevo;
  for (const oyente of oyentes) oyente();
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

const NINGUNO = new Set<string>();

/** Ids de los archivos que se están bajando al celular ahora. */
export function useDescargasPendientes(): Set<string> {
  return useSyncExternalStore(suscribir, () => pendientes, () => NINGUNO);
}

/**
 * Baja al celular las fotos y firmas ya subidas de un informe que todavía no
 * tiene copia local (firmas primero). Lo que no se pueda bajar se muestra con
 * la URL firmada, como antes. Nunca rechaza.
 */
export function descargarArchivosFaltantes(informeId: string): Promise<void> {
  // Nunca dos descargas del mismo informe a la vez. Si se pide de nuevo
  // mientras baja (p. ej. se volvió a entrar tras cortarse la señal), al
  // terminar se hace otra pasada con lo que todavía falte.
  const actual = enCursoPorInforme.get(informeId);
  if (actual) {
    actual.repetir = true;
    return actual.promesa;
  }
  const estado = { repetir: false, promesa: Promise.resolve() };
  estado.promesa = (async () => {
    do {
      estado.repetir = false;
      await descargar(informeId).catch(() => undefined);
    } while (estado.repetir);
  })().finally(() => enCursoPorInforme.delete(informeId));
  enCursoPorInforme.set(informeId, estado);
  return estado.promesa;
}

const enCursoPorInforme = new Map<string, { repetir: boolean; promesa: Promise<void> }>();

async function descargar(informeId: string): Promise<void> {
  const archivos = await db.archivos.where("informe_id").equals(informeId).toArray();
  const conCopia = new Set(await db.blobs.where("id").anyOf(archivos.map((a) => a.id)).primaryKeys());
  const faltan = archivos
    .filter((a) => a.url && !conCopia.has(a.id) && !pendientes.has(a.id))
    .sort((a, b) => Number(a.tipo === "foto") - Number(b.tipo === "foto"));
  if (faltan.length === 0) return;
  cambiar((s) => faltan.forEach((a) => s.add(a.id)));

  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < faltan.length) {
      const archivo = faltan[siguiente++];
      try {
        const { data } = await supabase().storage.from(BUCKET).download(archivo.url as string);
        if (data) {
          const registro = await prepararBlob(archivo.id, data);
          // Si se borró o se rehízo mientras bajaba, no se guarda (no deja basura).
          await db.transaction("rw", [db.archivos, db.blobs], async () => {
            const actual = await db.archivos.get(archivo.id);
            if (actual && actual.url === archivo.url && !(await db.blobs.get(archivo.id))) {
              await db.blobs.put(registro);
            }
          });
        }
      } catch {
        /* sin señal o error: queda la URL firmada como respaldo */
      } finally {
        cambiar((s) => s.delete(archivo.id));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, faltan.length) }, trabajador));
}
