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

export type Nivel = "si" | "no" | "ok" | "mal" | "optimo" | "bajo" | "alto" | null;

export type OkMal = "ok" | "mal" | null;

export type SiNoOkMal = "si" | "no" | "ok" | "mal" | null;

export type OptimoBajoAlto = "optimo" | "bajo" | "alto" | null;

export type BajaAlta = "ok" | "baja" | "alta" | null;

export type FotoEstado = "ok" | "si" | "no" | null;

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
  presion_aceite_motor: Nivel;
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
  ge_motor_detenido_aceite_motor: OkMal;
  ge_motor_detenido_agua_radiador: OkMal;
  ge_motor_detenido_restriccion_aire: SiNo;
  ge_motor_detenido_tension_correas: OkMal;
  ge_motor_detenido_estado_baterias: OkMal;
  ge_motor_detenido_inst_electrica: OkMal;
  ge_motor_detenido_cableado_distrib: OkMal;
  ge_motor_detenido_cubo_ventilador: OkMal;
  ge_motor_detenido_ajuste_motor: SiNo;
  ge_motor_detenido_union_tubo_aire: OkMal;
  ge_motor_detenido_lineas_combustible: OkMal;
  ge_motor_detenido_dca_anticongelante: OkMal;
  ge_motor_detenido_ajuste_inyectores: SiNo;
  ge_motor_detenido_calibre_inyectores: SiNo;
  ge_funcionamiento_sistema_arranque: OkMal;
  ge_funcionamiento_mangueras: OkMal;
  ge_funcionamiento_presion_aceite: OkMal;
  ge_funcionamiento_temp_agua: OptimoBajoAlto;
  ge_funcionamiento_diferencial_temp: OptimoBajoAlto;
  ge_funcionamiento_vibraciones: SiNo;
  ge_funcionamiento_antivibratorios: OkMal;
  ge_funcionamiento_llave_termomagnetica: OkMal;
  ge_funcionamiento_carga_alternador: SiNo;
  ge_funcionamiento_llave_transferencia: SiNo;
  ge_funcionamiento_rpm_max: OptimoBajoAlto;
  ge_funcionamiento_circ_seguridad: OkMal;
  ge_funcionamiento_ventilacion_aire: OkMal;
  ge_funcionamiento_perdidas_aceite: OptimoBajoAlto;
  ge_funcionamiento_perdidas_combustible: SiNo;
  ge_funcionamiento_restriccion_escape: SiNo;
  ge_funcionamiento_restriccion_aire: SiNo;
  ge_funcionamiento_frecuencia: BajaAlta;
  ge_funcionamiento_tension_linea: BajaAlta;
  ge_funcionamiento_amperaje_f1: OptimoBajoAlto;
  ge_funcionamiento_amperaje_f2: OptimoBajoAlto;
  ge_funcionamiento_amperaje_f3: OptimoBajoAlto;
  ge_funcionamiento_tension_linea_carga: BajaAlta;
  ge_funcionamiento_temp_ambiente: number | null;
  ge_funcionamiento_inspeccion_bateria: OkMal;
  ge_funcionamiento_accion_electrico: SiNo;
}

export type TipoArchivo = "foto" | "firma_tecnico" | "firma_cliente";

export interface ArchivoLocal {
  id: string;
  informe_id: string;
  tipo: TipoArchivo;
  categoria: CategoriaFoto | null;
  url: string | null;
  estado_sync: "pendiente" | "subiendo" | "sincronizado" | "error";
  creado_en: string;
}

export interface BlobArchivo {
  id: string;
  blob: Blob;
}
