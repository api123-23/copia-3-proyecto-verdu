import { db } from "./db";
import type {
  InformeGeneral,
  InformeGrupoElectrogeno,
  TipoEquipo,
  ValoresBase,
} from "./types";

export const TIPOS_EQUIPO: { value: TipoEquipo; label: string }[] = [
  { value: "motocompresor", label: "Motocompresor" },
  { value: "compresor", label: "Compresor" },
  { value: "grupo_electrogeno", label: "Grupo Electrógeno" },
  { value: "extraordinarios", label: "Extraordinarios" },
  { value: "vehiculos", label: "Vehículos Móviles y Máquinas Viales" },
];

export function crearInforme(tecnico_id: string | null): InformeGeneral {
  const ahora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    numero_registro: null,
    cliente_id: null,
    cliente_nombre: "",
    cliente_telefono: null,
    cliente_direccion: null,
    tecnico_id,
    fecha_hora: ahora,
    tipo_equipo: "motocompresor",
    observaciones: null,
    observaciones_ia: null,
    maquina_operativa: null,
    horas_trabajadas: null,
    repuestos_air_power: null,
    repuestos_cliente: null,
    requiere_cotizacion: false,
    cotizacion_notas: null,
    cotizacion_notas_ia: null,
    estado_firma: "pendiente",
    cerrado: false,
    firma_tecnico_url: null,
    firma_cliente_url: null,
    aclaracion_firma: null,
    firmado_en: null,
    creado_en: ahora,
    actualizado_en: ahora,
    sincronizado_en: null,
    estado_sync: "pendiente",
    error_sync: null,
  };
}

export function formatNumero(n: number | null): string {
  return n === null ? "—" : String(n).padStart(6, "0");
}

export function valoresVacios(): ValoresBase {
  return {
    horometro: null,
    aceite_motor: null,
    aceite_unidad: null,
    refrig_radiador: null,
    estado_bateria: null,
    conec_purga: null,
    inst_electrica: null,
    carroceria: null,
    jabalina: null,
    aislacion_suelo: null,
    rpm_min: null,
    rpm_max: null,
    tension_linea_f1: null,
    tension_linea_f2: null,
    tension_linea_f3: null,
    tension_gen_f1: null,
    tension_gen_f2: null,
    tension_gen_f3: null,
    cons_carga_f1: null,
    cons_carga_f2: null,
    cons_carga_f3: null,
    cons_descarga_f1: null,
    cons_descarga_f2: null,
    cons_descarga_f3: null,
    temp_ambiente: null,
    temp_refrigerante: null,
    presion_unidad_comp: null,
    presion_aceite_motor: null,
    circuito_refr_m: null,
    circuito_despresuriz: null,
    circuito_arranque: null,
    circuito_seguridad: null,
    circuito_electr: null,
    tiempo_y_delta: null,
    diferencial: null,
    perdida_aceite_motor: null,
    perdida_refrigerante: null,
    perdida_aire: null,
    perdida_combustible: null,
  };
}

export function valoresVaciosGE(): InformeGrupoElectrogeno {
  return {
    informe_id: "",
    ge_motor_detenido_aceite_motor: null,
    ge_motor_detenido_agua_radiador: null,
    ge_motor_detenido_restriccion_aire: null,
    ge_motor_detenido_tension_correas: null,
    ge_motor_detenido_estado_baterias: null,
    ge_motor_detenido_inst_electrica: null,
    ge_motor_detenido_cableado_distrib: null,
    ge_motor_detenido_cubo_ventilador: null,
    ge_motor_detenido_ajuste_motor: null,
    ge_motor_detenido_union_tubo_aire: null,
    ge_motor_detenido_lineas_combustible: null,
    ge_motor_detenido_dca_anticongelante: null,
    ge_motor_detenido_ajuste_inyectores: null,
    ge_motor_detenido_calibre_inyectores: null,
    ge_funcionamiento_sistema_arranque: null,
    ge_funcionamiento_mangueras: null,
    ge_funcionamiento_presion_aceite: null,
    ge_funcionamiento_temp_agua: null,
    ge_funcionamiento_diferencial_temp: null,
    ge_funcionamiento_vibraciones: null,
    ge_funcionamiento_antivibratorios: null,
    ge_funcionamiento_llave_termomagnetica: null,
    ge_funcionamiento_carga_alternador: null,
    ge_funcionamiento_llave_transferencia: null,
    ge_funcionamiento_rpm_max: null,
    ge_funcionamiento_circ_seguridad: null,
    ge_funcionamiento_ventilacion_aire: null,
    ge_funcionamiento_perdidas_aceite: null,
    ge_funcionamiento_perdidas_combustible: null,
    ge_funcionamiento_restriccion_escape: null,
    ge_funcionamiento_restriccion_aire: null,
    ge_funcionamiento_frecuencia: null,
    ge_funcionamiento_tension_linea: null,
    ge_funcionamiento_amperaje_f1: null,
    ge_funcionamiento_amperaje_f2: null,
    ge_funcionamiento_amperaje_f3: null,
    ge_funcionamiento_tension_linea_carga: null,
    ge_funcionamiento_temp_ambiente: null,
    ge_funcionamiento_inspeccion_bateria: null,
    ge_funcionamiento_accion_electrico: null,
  };
}

export const CAMPOS_POR_TIPO: Record<TipoEquipo, (keyof ValoresBase)[]> = {
  motocompresor: [
    "horometro",
    "aceite_motor",
    "aceite_unidad",
    "refrig_radiador",
    "estado_bateria",
    "conec_purga",
    "inst_electrica",
    "carroceria",
    "jabalina",
    "aislacion_suelo",
    "temp_ambiente",
    "temp_refrigerante",
    "presion_unidad_comp",
    "presion_aceite_motor",
    "perdida_aceite_motor",
    "perdida_refrigerante",
    "perdida_aire",
    "perdida_combustible",
  ],
  compresor: [
    "horometro",
    "aceite_unidad",
    "inst_electrica",
    "jabalina",
    "aislacion_suelo",
    "tension_linea_f1",
    "tension_linea_f2",
    "tension_linea_f3",
    "temp_ambiente",
    "temp_refrigerante",
    "circuito_refr_m",
    "circuito_despresuriz",
    "circuito_arranque",
    "circuito_seguridad",
    "circuito_electr",
    "tiempo_y_delta",
    "diferencial",
    "perdida_aceite_motor",
  ],
  vehiculos: [
    "horometro",
    "aceite_motor",
    "refrig_radiador",
    "estado_bateria",
    "inst_electrica",
    "carroceria",
    "temp_ambiente",
    "temp_refrigerante",
    "perdida_aceite_motor",
    "perdida_refrigerante",
    "perdida_aire",
    "perdida_combustible",
  ],
  extraordinarios: [],
  grupo_electrogeno: [],
};

export const CAMPO_LABELS: Record<keyof ValoresBase, string> = {
  horometro: "Horómetro",
  aceite_motor: "Aceite Motor",
  aceite_unidad: "Aceite Unidad",
  refrig_radiador: "Refrig. Rad.",
  estado_bateria: "Est. Batería",
  conec_purga: "Conec. Purga",
  inst_electrica: "Inst. Eléctrica",
  carroceria: "Carrocería",
  jabalina: "Jabalina",
  aislacion_suelo: "Aislac. Suelo",
  rpm_min: "RPM Min",
  rpm_max: "RPM Max",
  tension_linea_f1: "Tensión Línea F1",
  tension_linea_f2: "Tensión Línea F2",
  tension_linea_f3: "Tensión Línea F3",
  tension_gen_f1: "Tensión Gen. F1",
  tension_gen_f2: "Tensión Gen. F2",
  tension_gen_f3: "Tensión Gen. F3",
  cons_carga_f1: "Cons. Carga F1",
  cons_carga_f2: "Cons. Carga F2",
  cons_carga_f3: "Cons. Carga F3",
  cons_descarga_f1: "Cons. Descarga F1",
  cons_descarga_f2: "Cons. Descarga F2",
  cons_descarga_f3: "Cons. Descarga F3",
  temp_ambiente: "Temp. Ambiente",
  temp_refrigerante: "Temp. Refrigerante/Aceite",
  presion_unidad_comp: "Presión Unid. Comp.",
  presion_aceite_motor: "Presión Aceite Motor",
  circuito_refr_m: "Refr. M.",
  circuito_despresuriz: "Despresuriz.",
  circuito_arranque: "Arranque",
  circuito_seguridad: "Seguridad",
  circuito_electr: "Electr.",
  tiempo_y_delta: "Tiempo Y-Δ",
  diferencial: "Diferencial",
  perdida_aceite_motor: "Pérdida Aceite Motor",
  perdida_refrigerante: "Pérdida Refrigerante",
  perdida_aire: "Pérdida Aire",
  perdida_combustible: "Pérdida Combustible",
};

export function aplica(tipo: TipoEquipo, campo: keyof ValoresBase): boolean {
  return CAMPOS_POR_TIPO[tipo].includes(campo);
}

export function construirAnexa(
  tipo: TipoEquipo,
  informe_id: string,
  v: ValoresBase
): Record<string, unknown> | null {
  if (tipo === "extraordinarios") return null;
  if (tipo === "grupo_electrogeno") return null;
  const out: Record<string, unknown> = { informe_id };
  for (const campo of CAMPOS_POR_TIPO[tipo]) out[campo] = v[campo];
  return out;
}

export async function guardarBorrador(
  informe: InformeGeneral,
  valores: ValoresBase,
  valoresGE?: InformeGrupoElectrogeno | null
): Promise<void> {
  const actualizado = { ...informe, actualizado_en: new Date().toISOString() };
  await db.transaction(
    "rw",
    [
      db.informes,
      db.valores_motocompresor,
      db.valores_compresor,
      db.valores_vehiculos,
      db.valores_grupo_electrogeno,
    ],
    async () => {
      await db.informes.put(actualizado);
      const anexa = construirAnexa(actualizado.tipo_equipo, actualizado.id, valores);
      await db.valores_motocompresor.where("informe_id").equals(actualizado.id).delete();
      await db.valores_compresor.where("informe_id").equals(actualizado.id).delete();
      await db.valores_vehiculos.where("informe_id").equals(actualizado.id).delete();
      await db.valores_grupo_electrogeno.where("informe_id").equals(actualizado.id).delete();
      if (anexa) {
        const tabla =
          actualizado.tipo_equipo === "motocompresor"
            ? db.valores_motocompresor
            : actualizado.tipo_equipo === "compresor"
              ? db.valores_compresor
              : db.valores_vehiculos;
        await tabla.put(anexa as never);
      }
      if (actualizado.tipo_equipo === "grupo_electrogeno" && valoresGE) {
        await db.valores_grupo_electrogeno.put({
          ...valoresGE,
          informe_id: actualizado.id,
        } as InformeGrupoElectrogeno);
      }
    }
  );
}

export async function cargarAnexa(
  tipo: TipoEquipo,
  informe_id: string
): Promise<Partial<ValoresBase>> {
  if (tipo === "extraordinarios" || tipo === "grupo_electrogeno") return {};
  const tabla =
    tipo === "motocompresor"
      ? db.valores_motocompresor
      : tipo === "compresor"
        ? db.valores_compresor
        : db.valores_vehiculos;
  const fila = await tabla.get(informe_id);
  if (!fila) return {};
  const resto = { ...fila } as unknown as Record<string, unknown>;
  delete resto.informe_id;
  return resto as Partial<ValoresBase>;
}

export async function cargarAnexaGE(
  informe_id: string
): Promise<InformeGrupoElectrogeno> {
  const fila = await db.valores_grupo_electrogeno.get(informe_id);
  if (!fila) return { ...valoresVaciosGE(), informe_id };
  return fila;
}
