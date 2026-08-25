export type TipoEquipo =
  | "motocompresor"
  | "compresor"
  | "grupo_electrogeno"
  | "extraordinarios"
  | "vehiculos";

export type EstadoFirma = "pendiente" | "firmado";

export type EstadoSync =
  | "pendiente"
  | "subiendo_imagenes"
  | "imagenes_ok"
  | "sincronizado"
  | "error";

export type SiNo = "si" | "no" | null;

export type Nivel = "si" | "no" | "optimo" | "bajo" | null;

export type CategoriaFoto = "inicial" | "desarrollo" | "repuestos" | "final" | "falla";

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface InformeGeneral {
  id: string;
  numero_registro: number | null;
  cliente_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  tecnico_id: string | null;
  fecha_hora: string;
  tipo_equipo: TipoEquipo;
  observaciones: string | null;
  observaciones_ia: string | null;
  maquina_operativa: boolean | null;
  horas_trabajadas: number | null;
  repuestos_air_power: string | null;
  repuestos_cliente: string | null;
  requiere_cotizacion: boolean;
  cotizacion_notas: string | null;
  cotizacion_notas_ia: string | null;
  estado_firma: EstadoFirma;
  cerrado: boolean;
  firma_tecnico_url: string | null;
  firma_cliente_url: string | null;
  aclaracion_firma: string | null;
  firmado_en: string | null;
  creado_en: string;
  actualizado_en: string;
  sincronizado_en: string | null;
  estado_sync: EstadoSync;
  error_sync: string | null;
}

export interface ValoresBase {
  horometro: number | null;
  aceite_motor: Nivel;
  aceite_unidad: SiNo;
  refrig_radiador: Nivel;
  estado_bateria: Nivel;
  conec_purga: SiNo;
  inst_electrica: SiNo;
  carroceria: SiNo;
  jabalina: SiNo;
  aislacion_suelo: SiNo;
  rpm_min: number | null;
  rpm_max: number | null;
  tension_linea_f1: number | null;
  tension_linea_f2: number | null;
  tension_linea_f3: number | null;
  tension_gen_f1: number | null;
  tension_gen_f2: number | null;
  tension_gen_f3: number | null;
  cons_carga_f1: number | null;
  cons_carga_f2: number | null;
  cons_carga_f3: number | null;
  cons_descarga_f1: number | null;
  cons_descarga_f2: number | null;
  cons_descarga_f3: number | null;
  temp_ambiente: number | null;
  temp_refrigerante: number | null;
  presion_unidad_comp: number | null;
  presion_aceite_motor: number | null;
  circuito_refr_m: SiNo;
  circuito_despresuriz: SiNo;
  circuito_arranque: SiNo;
  circuito_seguridad: SiNo;
  circuito_electr: SiNo;
  tiempo_y_delta: string | null;
  diferencial: string | null;
  perdida_aceite_motor: SiNo;
  perdida_refrigerante: SiNo;
  perdida_aire: SiNo;
  perdida_combustible: SiNo;
}

export type InformeMotocompresor = { informe_id: string } & Omit<
  ValoresBase,
  | "rpm_min"
  | "rpm_max"
  | "tension_linea_f1"
  | "tension_linea_f2"
  | "tension_linea_f3"
  | "tension_gen_f1"
  | "tension_gen_f2"
  | "tension_gen_f3"
  | "cons_carga_f1"
  | "cons_carga_f2"
  | "cons_carga_f3"
  | "cons_descarga_f1"
  | "cons_descarga_f2"
  | "cons_descarga_f3"
  | "circuito_refr_m"
  | "circuito_despresuriz"
  | "circuito_arranque"
  | "circuito_seguridad"
  | "circuito_electr"
  | "tiempo_y_delta"
  | "diferencial"
>;

export type InformeCompresor = { informe_id: string } & Omit<
  ValoresBase,
  | "aceite_motor"
  | "refrig_radiador"
  | "estado_bateria"
  | "conec_purga"
  | "carroceria"
  | "rpm_min"
  | "rpm_max"
  | "tension_gen_f1"
  | "tension_gen_f2"
  | "tension_gen_f3"
  | "cons_carga_f1"
  | "cons_carga_f2"
  | "cons_carga_f3"
  | "cons_descarga_f1"
  | "cons_descarga_f2"
  | "cons_descarga_f3"
  | "presion_unidad_comp"
  | "presion_aceite_motor"
  | "perdida_refrigerante"
  | "perdida_aire"
  | "perdida_combustible"
>;

export type InformeVehiculos = { informe_id: string } & Omit<
  ValoresBase,
  | "aceite_unidad"
  | "conec_purga"
  | "jabalina"
  | "aislacion_suelo"
  | "rpm_min"
  | "rpm_max"
  | "tension_linea_f1"
  | "tension_linea_f2"
  | "tension_linea_f3"
  | "tension_gen_f1"
  | "tension_gen_f2"
  | "tension_gen_f3"
  | "cons_carga_f1"
  | "cons_carga_f2"
  | "cons_carga_f3"
  | "cons_descarga_f1"
  | "cons_descarga_f2"
  | "cons_descarga_f3"
  | "presion_unidad_comp"
  | "presion_aceite_motor"
  | "circuito_refr_m"
  | "circuito_despresuriz"
  | "circuito_arranque"
  | "circuito_seguridad"
  | "circuito_electr"
  | "tiempo_y_delta"
  | "diferencial"
>;

export interface InformeGrupoElectrogeno {
  informe_id: string;
}

export type TipoArchivo = "foto" | "firma_tecnico" | "firma_cliente";

export interface ArchivoLocal {
  id: string;
  informe_id: string;
  tipo: TipoArchivo;
  categoria: CategoriaFoto | null;
  blob: Blob;
  url: string | null;
  estado_sync: "pendiente" | "subiendo" | "sincronizado" | "error";
  creado_en: string;
}
