"use client";

import type { InformeGrupoElectrogeno, TipoEquipo, ValoresBase } from "@/lib/types";
import { aplica, valoresVaciosGE } from "@/lib/informes";
import {
  CampoNumero,
  GrupoTitulo,
  ItemSelect,
  ItemSelectFull,
  OPCIONES_BAJA_ALTA,
  OPCIONES_NIVEL,
  OPCIONES_OK_BAJO,
  OPCIONES_OK_MAL,
  OPCIONES_OK_NO,
  OPCIONES_OPTIMO_BAJO_ALTO,
  OPCIONES_SI_NO,
  Seccion,
  SubTitulo,
} from "@/components/ui";

type Patch = Partial<ValoresBase>;
type PatchGE = Partial<InformeGrupoElectrogeno>;

function SeccionValoresGE({
  valoresGE,
  onChangeGE,
}: {
  valoresGE: InformeGrupoElectrogeno;
  onChangeGE: (p: PatchGE) => void;
}) {
  const setGE = (campo: keyof InformeGrupoElectrogeno) => (v: unknown) =>
    onChangeGE({ [campo]: v } as PatchGE);

  return (
    <>
      <SubTitulo>Verificar Con Motor Detenido</SubTitulo>
      <div className="flex flex-col gap-1 mb-sm">
        <ItemSelectFull etiqueta="1. Nivel de aceite de motor" opciones={OPCIONES_NIVEL} valor={valoresGE.ge_motor_detenido_aceite_motor} onChange={setGE("ge_motor_detenido_aceite_motor")} />
        <ItemSelectFull etiqueta="2. Nivel de agua radiador y refriger." opciones={OPCIONES_NIVEL} valor={valoresGE.ge_motor_detenido_agua_radiador} onChange={setGE("ge_motor_detenido_agua_radiador")} />
        <ItemSelectFull etiqueta="3. Restricción en el filtro de aire" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_motor_detenido_restriccion_aire} onChange={setGE("ge_motor_detenido_restriccion_aire")} />
        <ItemSelectFull etiqueta="4. Tensión correas vent. Alternador" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_tension_correas} onChange={setGE("ge_motor_detenido_tension_correas")} />
        <ItemSelectFull etiqueta="5. Estado baterías" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_estado_baterias} onChange={setGE("ge_motor_detenido_estado_baterias")} />
        <ItemSelectFull etiqueta="6. Estado inst. eléctrica" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_inst_electrica} onChange={setGE("ge_motor_detenido_inst_electrica")} />
        <ItemSelectFull etiqueta="7. Cableado de distrib. de potencia" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_cableado_distrib} onChange={setGE("ge_motor_detenido_cableado_distrib")} />
        <ItemSelectFull etiqueta="8. Cubo de ventilador, polea y bomba de agua" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_cubo_ventilador} onChange={setGE("ge_motor_detenido_cubo_ventilador")} />
        <ItemSelectFull etiqueta="9. Ajuste de piezas de montaje de motor" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_motor_detenido_ajuste_motor} onChange={setGE("ge_motor_detenido_ajuste_motor")} />
        <ItemSelectFull etiqueta="10. Estado uniones y tubo admis. aire" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_union_tubo_aire} onChange={setGE("ge_motor_detenido_union_tubo_aire")} />
        <ItemSelectFull etiqueta="11. Conexiones y líneas de combustible" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_lineas_combustible} onChange={setGE("ge_motor_detenido_lineas_combustible")} />
      </div>

      <div className="pt-sm border-t border-outline-variant">
        <SubTitulo>Verificaciones de Funcionamiento</SubTitulo>
        <div className="flex flex-col gap-1">
          <ItemSelectFull etiqueta="1. Sistema de arranque" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_sistema_arranque} onChange={setGE("ge_funcionamiento_sistema_arranque")} />
          <ItemSelectFull etiqueta="2. Mangueras y conexiones" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_mangueras} onChange={setGE("ge_funcionamiento_mangueras")} />
          <ItemSelectFull etiqueta="3. Presión de aceite" opciones={OPCIONES_OK_BAJO} valor={valoresGE.ge_funcionamiento_presion_aceite} onChange={setGE("ge_funcionamiento_presion_aceite")} />
          <ItemSelectFull etiqueta="4. Temp. Agua motor" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_temp_agua} onChange={setGE("ge_funcionamiento_temp_agua")} />
          <ItemSelectFull etiqueta="5. Diferencial de Temperatura de Radiador" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_diferencial_temp} onChange={setGE("ge_funcionamiento_diferencial_temp")} />
          <ItemSelectFull etiqueta="6. Vibraciones inusuales" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_vibraciones} onChange={setGE("ge_funcionamiento_vibraciones")} />
          <ItemSelectFull etiqueta="7. Antivibratorios" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_antivibratorios} onChange={setGE("ge_funcionamiento_antivibratorios")} />
          <ItemSelectFull etiqueta="8. Llave termomagnética" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_llave_termomagnetica} onChange={setGE("ge_funcionamiento_llave_termomagnetica")} />
          <ItemSelectFull etiqueta="9. Carga alternador" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_carga_alternador} onChange={setGE("ge_funcionamiento_carga_alternador")} />
          <ItemSelectFull etiqueta="10. Llave de transferencia" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_llave_transferencia} onChange={setGE("ge_funcionamiento_llave_transferencia")} />
          <ItemSelectFull etiqueta="11. R.P.M. Motor máxima" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_rpm_max} onChange={setGE("ge_funcionamiento_rpm_max")} />
          <ItemSelectFull etiqueta="12. Funcionamiento circ. Seguridad" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_circ_seguridad} onChange={setGE("ge_funcionamiento_circ_seguridad")} />
          <ItemSelectFull etiqueta="13. Ventilación de aire generador" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_ventilacion_aire} onChange={setGE("ge_funcionamiento_ventilacion_aire")} />
          <ItemSelectFull etiqueta="14. Pérdidas aceite motor" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_perdidas_aceite} onChange={setGE("ge_funcionamiento_perdidas_aceite")} />
          <ItemSelectFull etiqueta="15. Pérdidas circuito combustible" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_perdidas_combustible} onChange={setGE("ge_funcionamiento_perdidas_combustible")} />
          <ItemSelectFull etiqueta="16. Restricc. en el escape" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_restriccion_escape} onChange={setGE("ge_funcionamiento_restriccion_escape")} />
          <ItemSelectFull etiqueta="17. Restricción en entrada y salida de aire" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_restriccion_aire} onChange={setGE("ge_funcionamiento_restriccion_aire")} />
          <ItemSelectFull etiqueta="18. Frecuencia (medición)" opciones={OPCIONES_BAJA_ALTA} valor={valoresGE.ge_funcionamiento_frecuencia} onChange={setGE("ge_funcionamiento_frecuencia")} />
          <ItemSelectFull etiqueta="19. Tensión de línea" opciones={OPCIONES_BAJA_ALTA} valor={valoresGE.ge_funcionamiento_tension_linea} onChange={setGE("ge_funcionamiento_tension_linea")} />
          <div className="flex flex-col gap-1 bg-surface-container-low p-1.5 rounded">
            <span className="text-body-md font-body-md text-[12px]">20. Amperaje Fases</span>
            <div className="flex gap-2">
              {(["ge_funcionamiento_amperaje_f1", "ge_funcionamiento_amperaje_f2", "ge_funcionamiento_amperaje_f3"] as const).map((campo, i) => (
                <div key={campo} className="flex-1 flex items-center gap-1">
                  <span className="text-[10px]">F{i + 1}</span>
                  <input
                    className="input-technical w-full h-[22px] py-0 px-1 text-[11px] text-center text-data-mono font-data-mono"
                    type="number"
                    placeholder="A"
                    value={valoresGE[campo] ?? ""}
                    onChange={(e) => setGE(campo)(e.target.value === "" ? null : Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
          <ItemSelectFull etiqueta="21. Tensión de línea con carga" opciones={OPCIONES_BAJA_ALTA} valor={valoresGE.ge_funcionamiento_tension_linea_carga} onChange={setGE("ge_funcionamiento_tension_linea_carga")} />
          <div className="flex justify-between items-center bg-surface-container-low p-1.5 rounded">
            <span className="text-body-md font-body-md text-[12px]">22. Temperatura ambiente</span>
            <input
              className="input-technical w-16 h-[22px] py-0 px-1 text-[11px] text-center text-data-mono font-data-mono"
              type="number"
              placeholder="°C"
              value={valoresGE.ge_funcionamiento_temp_ambiente ?? ""}
              onChange={(e) => onChangeGE({ ge_funcionamiento_temp_ambiente: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <ItemSelectFull etiqueta="23. Inspección de batería" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_inspeccion_bateria} onChange={setGE("ge_funcionamiento_inspeccion_bateria")} />
          <ItemSelectFull etiqueta="24. Accionamiento de circ. eléctrico" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_accion_electrico} onChange={setGE("ge_funcionamiento_accion_electrico")} />
        </div>
      </div>
    </>
  );
}

export default function SeccionValores({
  tipo,
  valores,
  onChange,
  valoresGE,
  onChangeGE,
}: {
  tipo: TipoEquipo;
  valores: ValoresBase;
  onChange: (p: Patch) => void;
  valoresGE?: InformeGrupoElectrogeno;
  onChangeGE?: (p: PatchGE) => void;
}) {
  if (tipo === "extraordinarios") return null;

  if (tipo === "grupo_electrogeno") {
    if (!onChangeGE) return null;
    return (
      <Seccion titulo="Valores">
        <SeccionValoresGE valoresGE={valoresGE ?? valoresVaciosGE()} onChangeGE={onChangeGE} />
      </Seccion>
    );
  }

  const set = (campo: keyof ValoresBase) => (v: unknown) =>
    onChange({ [campo]: v } as Patch);

  const esCompresor = tipo === "compresor";

  const bloqueDetenido =
    aplica(tipo, "horometro") ||
    aplica(tipo, "aceite_motor") ||
    aplica(tipo, "aceite_unidad") ||
    aplica(tipo, "refrig_radiador") ||
    aplica(tipo, "estado_bateria") ||
    aplica(tipo, "conec_purga") ||
    aplica(tipo, "inst_electrica") ||
    aplica(tipo, "carroceria") ||
    aplica(tipo, "jabalina") ||
    aplica(tipo, "aislacion_suelo");

  const bloqueMarcha =
    aplica(tipo, "rpm_min") ||
    aplica(tipo, "tension_linea") ||
    aplica(tipo, "tension_gen_f1") ||
    aplica(tipo, "cons_carga_f1") ||
    aplica(tipo, "cons_descarga_f1") ||
    aplica(tipo, "temp_ambiente") ||
    aplica(tipo, "presion_unidad_comp") ||
    aplica(tipo, "circuito_refr_m");

  const bloquePerdidas =
    aplica(tipo, "perdida_aceite_motor") ||
    aplica(tipo, "perdida_refrigerante") ||
    aplica(tipo, "perdida_aire") ||
    aplica(tipo, "perdida_combustible");

  return (
    <Seccion titulo="Valores" badge="Obligatorio">
      <div className="space-y-md">
        {bloqueDetenido ? (
          <div>
            <SubTitulo>Con Motor Detenido</SubTitulo>
            {aplica(tipo, "horometro") ? (
              <div className="mb-sm">
                <CampoNumero etiqueta="Horómetro" sufijo="HRS" valor={valores.horometro} onChange={set("horometro")} />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-sm mb-sm border-b border-outline-variant pb-sm">
              <GrupoTitulo>NIVELES</GrupoTitulo>
              {aplica(tipo, "aceite_motor") ? (
                <ItemSelect etiqueta="Aceite Motor" opciones={OPCIONES_NIVEL} valor={valores.aceite_motor} onChange={set("aceite_motor")} />
              ) : null}
              {aplica(tipo, "aceite_unidad") ? (
                <ItemSelect etiqueta="Aceite Unidad" opciones={esCompresor ? OPCIONES_NIVEL : OPCIONES_SI_NO} valor={valores.aceite_unidad} onChange={set("aceite_unidad")} />
              ) : null}
              {aplica(tipo, "refrig_radiador") ? (
                <ItemSelect etiqueta="Refrig. Rad." opciones={OPCIONES_NIVEL} valor={valores.refrig_radiador} onChange={set("refrig_radiador")} />
              ) : null}
              {aplica(tipo, "estado_bateria") ? (
                <ItemSelect etiqueta="Est. Batería" opciones={OPCIONES_OK_MAL} valor={valores.estado_bateria} onChange={set("estado_bateria")} />
              ) : null}
              {aplica(tipo, "conec_purga") ? (
                <ItemSelect etiqueta="Conec. Purga" opciones={OPCIONES_SI_NO} valor={valores.conec_purga} onChange={set("conec_purga")} />
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <GrupoTitulo>ESTADO GENERAL</GrupoTitulo>
              {aplica(tipo, "inst_electrica") ? (
                <ItemSelect etiqueta="Inst. Eléctrica" opciones={OPCIONES_OK_MAL} valor={valores.inst_electrica} onChange={set("inst_electrica")} />
              ) : null}
              {aplica(tipo, "carroceria") ? (
                <ItemSelect etiqueta="Carrocería" opciones={OPCIONES_OK_MAL} valor={valores.carroceria} onChange={set("carroceria")} />
              ) : null}
              {aplica(tipo, "jabalina") ? (
                <ItemSelect etiqueta="Jabalina" opciones={OPCIONES_SI_NO} valor={valores.jabalina} onChange={set("jabalina")} />
              ) : null}
              {aplica(tipo, "aislacion_suelo") ? (
                <ItemSelect etiqueta="Aislac. Suelo" opciones={OPCIONES_SI_NO} valor={valores.aislacion_suelo} onChange={set("aislacion_suelo")} />
              ) : null}
            </div>
          </div>
        ) : null}

        {bloqueMarcha ? (
          <div className="pt-sm border-t border-outline-variant">
            <SubTitulo>Con Motor en Marcha</SubTitulo>
            {aplica(tipo, "rpm_min") ? (
              <div className="grid grid-cols-2 gap-sm mb-sm border-b border-outline-variant pb-sm">
                <CampoNumero etiqueta="RPM Min" valor={valores.rpm_min} onChange={set("rpm_min")} />
                <CampoNumero etiqueta="RPM Max" valor={valores.rpm_max} onChange={set("rpm_max")} />
              </div>
            ) : null}
            {aplica(tipo, "tension_linea") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TENSIÓN DE LÍNEA (V)</h4>
                <CampoNumero etiqueta="Voltaje General" centrado valor={valores.tension_linea} onChange={set("tension_linea")} />
              </div>
            ) : null}
            {aplica(tipo, "tension_gen_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TENSIÓN DE GEN. (V)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["tension_gen_f1", "tension_gen_f2", "tension_gen_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "cons_carga_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">CONS. EN CARGA (A)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["cons_carga_f1", "cons_carga_f2", "cons_carga_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "cons_descarga_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">CONS. EN DESCARGA (A)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["cons_descarga_f1", "cons_descarga_f2", "cons_descarga_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "temp_ambiente") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TEMPERATURA (°C)</h4>
                <div className="grid grid-cols-2 gap-sm">
                  <CampoNumero etiqueta="Ambiente" valor={valores.temp_ambiente} onChange={set("temp_ambiente")} />
                  <CampoNumero
                    etiqueta={esCompresor ? "Aceite" : "Refrigerante"}
                    valor={valores.temp_refrigerante}
                    onChange={set("temp_refrigerante")}
                  />
                </div>
              </div>
            ) : null}
            {aplica(tipo, "presion_unidad_comp") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">PRESIÓN</h4>
                <div className="grid grid-cols-2 gap-sm">
                  <CampoNumero etiqueta="Unid. Comp." valor={valores.presion_unidad_comp} onChange={set("presion_unidad_comp")} />
                  <ItemSelect etiqueta="Aceite Motor" opciones={OPCIONES_OK_BAJO} valor={valores.presion_aceite_motor} onChange={set("presion_aceite_motor")} />
                </div>
              </div>
            ) : null}
            {aplica(tipo, "circuito_refr_m") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">FUNCIONAMIENTO CIRCUITO</h4>
                <div className="grid grid-cols-2 gap-sm">
                  <ItemSelect etiqueta="Refr. M." opciones={OPCIONES_OK_MAL} valor={valores.circuito_refr_m} onChange={set("circuito_refr_m")} />
                  <ItemSelect etiqueta="Despresuriz." opciones={OPCIONES_SI_NO} valor={valores.circuito_despresuriz} onChange={set("circuito_despresuriz")} />
                  <ItemSelect etiqueta="Arranque" opciones={OPCIONES_OK_MAL} valor={valores.circuito_arranque} onChange={set("circuito_arranque")} />
                  <ItemSelect etiqueta="Seguridad" opciones={OPCIONES_OK_MAL} valor={valores.circuito_seguridad} onChange={set("circuito_seguridad")} />
                  <ItemSelect etiqueta="Electr." opciones={OPCIONES_OK_MAL} valor={valores.circuito_electr} onChange={set("circuito_electr")} />
                  <ItemSelect etiqueta="Tiempo Y-Δ" opciones={OPCIONES_NIVEL} valor={valores.tiempo_y_delta} onChange={set("tiempo_y_delta")} />
                  <ItemSelect etiqueta="Diferencial" opciones={OPCIONES_OK_NO} valor={valores.diferencial} onChange={set("diferencial")} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {bloquePerdidas ? (
          <div>
            <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">PÉRDIDAS</h4>
            <div className="grid grid-cols-2 gap-sm">
              {aplica(tipo, "perdida_aceite_motor") ? (
                <ItemSelect etiqueta="Aceite Motor" opciones={OPCIONES_SI_NO} valor={valores.perdida_aceite_motor} onChange={set("perdida_aceite_motor")} />
              ) : null}
              {aplica(tipo, "perdida_refrigerante") ? (
                <ItemSelect etiqueta="Refrigerante" opciones={OPCIONES_SI_NO} valor={valores.perdida_refrigerante} onChange={set("perdida_refrigerante")} />
              ) : null}
              {aplica(tipo, "perdida_aire") ? (
                <ItemSelect etiqueta="Aire" opciones={OPCIONES_SI_NO} valor={valores.perdida_aire} onChange={set("perdida_aire")} />
              ) : null}
              {aplica(tipo, "perdida_combustible") ? (
                <ItemSelect etiqueta="Combustible" opciones={OPCIONES_SI_NO} valor={valores.perdida_combustible} onChange={set("perdida_combustible")} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Seccion>
  );
}
