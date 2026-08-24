import Dexie, { type Table } from "dexie";
import type {
  ArchivoLocal,
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
  }
}

export const db = new AppDB();
