import Dexie, { type Table } from "dexie";
import type {
  ArchivoLocal,
  BlobArchivo,
  Cliente,
  InformeCompresor,
  InformeGeneral,
  InformeGrupoElectrogeno,
  InformeMotocompresor,
  InformeVehiculos,
} from "./types";

class AppDB extends Dexie {
  informes!: Table<InformeGeneral, string>;
  clientes!: Table<Cliente, string>;
  valores_motocompresor!: Table<InformeMotocompresor, string>;
  valores_compresor!: Table<InformeCompresor, string>;
  valores_vehiculos!: Table<InformeVehiculos, string>;
  valores_grupo_electrogeno!: Table<InformeGrupoElectrogeno, string>;
  archivos!: Table<ArchivoLocal, string>;
  blobs!: Table<BlobArchivo, string>;

  constructor() {
    super("verdu-informes");
    this.version(1).stores({
      informes:
        "id, numero_registro, cliente_id, tecnico_id, tipo_equipo, estado_firma, estado_sync, fecha_hora",
      clientes: "id, nombre",
      valores_motocompresor: "informe_id",
      valores_compresor: "informe_id",
      valores_vehiculos: "informe_id",
      valores_grupo_electrogeno: "informe_id",
      archivos: "id, informe_id, tipo, categoria, estado_sync",
    });
    this.version(2)
      .stores({
        informes:
          "id, numero_registro, cliente_id, tecnico_id, tipo_equipo, estado_firma, estado_sync, fecha_hora",
        clientes: "id, nombre",
        valores_motocompresor: "informe_id",
        valores_compresor: "informe_id",
        valores_vehiculos: "informe_id",
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
  }
}

export const db = new AppDB();
