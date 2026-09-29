import Dexie, { type Table } from "dexie";
import type {
  ArchivoLocal,
  BlobArchivo,
  InformeCompresor,
  InformeGeneral,
  InformeGrupoElectrogeno,
  InformeMotocompresor,
  InformeSecadores,
  InformeVehiculos,
} from "./types";

class AppDB extends Dexie {
  informes!: Table<InformeGeneral, string>;
  valores_motocompresor!: Table<InformeMotocompresor, string>;
  valores_compresor!: Table<InformeCompresor, string>;
  valores_vehiculos!: Table<InformeVehiculos, string>;
  valores_secadores!: Table<InformeSecadores, string>;
  valores_grupo_electrogeno!: Table<InformeGrupoElectrogeno, string>;
  archivos!: Table<ArchivoLocal, string>;
  blobs!: Table<BlobArchivo, string>;

  constructor() {
    super("verdu-informes");
    this.version(1).stores({
      informes:
        "id, numero_registro, cliente_id, tecnico_id, tipo_equipo, estado_firma, estado_sync, fecha_hora",
      valores_motocompresor: "informe_id",
      valores_compresor: "informe_id",
      valores_vehiculos: "informe_id",
      valores_secadores: "informe_id",
      valores_grupo_electrogeno: "informe_id",
      archivos: "id, informe_id, tipo, categoria, estado_sync",
    });
    this.version(2)
      .stores({
        informes:
          "id, numero_registro, cliente_id, tecnico_id, tipo_equipo, estado_firma, estado_sync, fecha_hora",
        valores_motocompresor: "informe_id",
        valores_compresor: "informe_id",
        valores_vehiculos: "informe_id",
        valores_secadores: "informe_id",
        valores_grupo_electrogeno: "informe_id",
        archivos: "id, informe_id, tipo, categoria, estado_sync",
        blobs: "id",
      })
      .upgrade(async (tx) => {
        type Viejo = ArchivoLocal & { blob?: Blob };
        const filas = await (tx.table("archivos") as Table<Viejo, string>).toArray();
        for (const fila of filas) {
          if (fila.blob) {
            await tx.table("blobs").put({ id: fila.id, blob: fila.blob });
          }
          const { blob: _blob, ...meta } = fila;
          await tx.table("archivos").put(meta);
        }
      });
    this.version(3).stores({
      informes:
        "id, numero_registro, cliente_id, tecnico_id, tipo_equipo, estado_firma, estado_sync, fecha_hora",
      valores_motocompresor: "informe_id",
      valores_compresor: "informe_id",
      valores_vehiculos: "informe_id",
      valores_secadores: "informe_id",
      valores_grupo_electrogeno: "informe_id",
      archivos: "id, informe_id, tipo, categoria, estado_sync",
      blobs: "id",
    });
    this.version(4).stores({
      informes:
        "id, numero_registro, cliente_id, tecnico_id, tipo_equipo, estado_firma, estado_sync, fecha_hora",
      valores_motocompresor: "informe_id",
      valores_compresor: "informe_id",
      valores_vehiculos: "informe_id",
      valores_grupo_electrogeno: "informe_id",
      valores_secadores: "informe_id",
      archivos: "id, informe_id, tipo, categoria, estado_sync",
      blobs: "id",
    });
  }
}

export const db = new AppDB();

// Safari en modo privado no permite guardar imágenes (Blob) en IndexedDB. En
// ese caso se guardan sus bytes y al leerlas se reconstruye el Blob, así el
// resto de la app no nota la diferencia.
db.blobs.hook("reading", (registro: BlobArchivo) => {
  if (registro && !(registro.blob instanceof Blob) && registro.datos) {
    return { ...registro, blob: new Blob([registro.datos], { type: registro.tipo || "application/octet-stream" }) };
  }
  return registro;
});

let blobSoportado: Promise<boolean> | null = null;

function soportaBlobs(): Promise<boolean> {
  if (!blobSoportado) {
    const id = "__prueba-blob__";
    blobSoportado = db.blobs
      .put({ id, blob: new Blob(["x"], { type: "text/plain" }) })
      .then(() => db.blobs.delete(id).catch(() => undefined))
      .then(() => true)
      .catch(() => false);
  }
  return blobSoportado;
}

/**
 * Prepara el registro de una imagen para guardarlo. Llamar ANTES de abrir una
 * transacción de Dexie (convertir a bytes es asíncrono y no puede ir dentro).
 */
export async function prepararBlob(id: string, blob: Blob): Promise<BlobArchivo> {
  if (await soportaBlobs()) return { id, blob };
  return { id, datos: await blob.arrayBuffer(), tipo: blob.type } as BlobArchivo;
}
