"use client";

import type { InformeGrupoElectrogeno, TipoEquipo, ValoresBase } from "@/lib/types";
import { aplica, valoresVaciosGE } from "@/lib/informes";
import {
  OPCIONES_BAJA_ALTA,
  CampoNumero,
  GrupoTitulo,
  ItemSelect,
  ItemSelectFull,
  OPCIONES_NIVEL,
  OPCIONES_OK_BAJO,
  OPCIONES_OK_BAJO_ALTO,
  OPCIONES_OK_MAL,
  OPCIONES_OK_MAL_NO_TIENE,
  OPCIONES_OPTIMO_ALTO_BAJO,
  OPCIONES_OK_NO,
  OPCIONES_OPTIMO_BAJO_ALTO,
  OPCIONES_SI_NO,
  OPCIONES_TIEMPO_Y_DELTA,
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
        <ItemSelectFull campo="ge_motor_detenido_aceite_motor" etiqueta="1. Nivel de aceite de motor" opciones={OPCIONES_NIVEL} valor={valoresGE.ge_motor_detenido_aceite_motor} onChange={setGE("ge_motor_detenido_aceite_motor")} />
        <ItemSelectFull campo="ge_motor_detenido_agua_radiador" etiqueta="2. Nivel de agua radiador y refriger." opciones={OPCIONES_NIVEL} valor={valoresGE.ge_motor_detenido_agua_radiador} onChange={setGE("ge_motor_detenido_agua_radiador")} />
        <ItemSelectFull campo="ge_motor_detenido_restriccion_aire" etiqueta="3. Restricción en el filtro de aire" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_motor_detenido_restriccion_aire} onChange={setGE("ge_motor_detenido_restriccion_aire")} />
        <ItemSelectFull campo="ge_motor_detenido_tension_correas" etiqueta="4. Tensión correas vent. Alternador" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_tension_correas} onChange={setGE("ge_motor_detenido_tension_correas")} />
        <ItemSelectFull campo="ge_motor_detenido_estado_baterias" etiqueta="5. Estado baterías" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_estado_baterias} onChange={setGE("ge_motor_detenido_estado_baterias")} />
        <ItemSelectFull campo="ge_motor_detenido_inst_electrica" etiqueta="6. Estado inst. eléctrica" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_inst_electrica} onChange={setGE("ge_motor_detenido_inst_electrica")} />
        <ItemSelectFull campo="ge_motor_detenido_cableado_distrib" etiqueta="7. Cableado de distrib. de potencia" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_cableado_distrib} onChange={setGE("ge_motor_detenido_cableado_distrib")} />
        <ItemSelectFull campo="ge_motor_detenido_cubo_ventilador" etiqueta="8. Cubo de ventilador, polea y bomba de agua" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_cubo_ventilador} onChange={setGE("ge_motor_detenido_cubo_ventilador")} />
        <ItemSelectFull campo="ge_motor_detenido_ajuste_motor" etiqueta="9. Ajuste de piezas de montaje de motor" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_motor_detenido_ajuste_motor} onChange={setGE("ge_motor_detenido_ajuste_motor")} />
        <ItemSelectFull campo="ge_motor_detenido_union_tubo_aire" etiqueta="10. Estado uniones y tubo admis. aire" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_union_tubo_aire} onChange={setGE("ge_motor_detenido_union_tubo_aire")} />
        <ItemSelectFull campo="ge_motor_detenido_lineas_combustible" etiqueta="11. Conexiones y líneas de combustible" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_motor_detenido_lineas_combustible} onChange={setGE("ge_motor_detenido_lineas_combustible")} />
      </div>

      <div className="pt-sm border-t border-outline-variant">
        <SubTitulo>Verificaciones de Funcionamiento</SubTitulo>
        <div className="flex flex-col gap-1">
          <ItemSelectFull campo="ge_funcionamiento_sistema_arranque" etiqueta="1. Sistema de arranque" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_sistema_arranque} onChange={setGE("ge_funcionamiento_sistema_arranque")} />
          <ItemSelectFull campo="ge_funcionamiento_mangueras" etiqueta="2. Mangueras y conexiones" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_mangueras} onChange={setGE("ge_funcionamiento_mangueras")} />
           <ItemSelectFull campo="ge_funcionamiento_presion_aceite" etiqueta="3. Presión de aceite" opciones={OPCIONES_OK_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_presion_aceite} onChange={setGE("ge_funcionamiento_presion_aceite")} />
          <ItemSelectFull campo="ge_funcionamiento_temp_agua" etiqueta="4. Temp. Agua motor" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_temp_agua} onChange={setGE("ge_funcionamiento_temp_agua")} />
          <ItemSelectFull campo="ge_funcionamiento_diferencial_temp" etiqueta="5. Diferencial de Temperatura de Radiador" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_diferencial_temp} onChange={setGE("ge_funcionamiento_diferencial_temp")} />
          <ItemSelectFull campo="ge_funcionamiento_vibraciones" etiqueta="6. Vibraciones inusuales" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_vibraciones} onChange={setGE("ge_funcionamiento_vibraciones")} />
          <ItemSelectFull campo="ge_funcionamiento_antivibratorios" etiqueta="7. Antivibratorios" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_antivibratorios} onChange={setGE("ge_funcionamiento_antivibratorios")} />
          <ItemSelectFull campo="ge_funcionamiento_llave_termomagnetica" etiqueta="8. Llave termomagnética" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_llave_termomagnetica} onChange={setGE("ge_funcionamiento_llave_termomagnetica")} />
          <ItemSelectFull campo="ge_funcionamiento_carga_alternador" etiqueta="9. Carga alternador" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_carga_alternador} onChange={setGE("ge_funcionamiento_carga_alternador")} />
          <ItemSelectFull campo="ge_funcionamiento_llave_transferencia" etiqueta="10. Llave de transferencia" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_llave_transferencia} onChange={setGE("ge_funcionamiento_llave_transferencia")} />
          <ItemSelectFull campo="ge_funcionamiento_rpm_max" etiqueta="11. R.P.M. Motor máxima" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_rpm_max} onChange={setGE("ge_funcionamiento_rpm_max")} />
          <ItemSelectFull campo="ge_funcionamiento_circ_seguridad" etiqueta="12. Funcionamiento circ. Seguridad" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_circ_seguridad} onChange={setGE("ge_funcionamiento_circ_seguridad")} />
          <ItemSelectFull campo="ge_funcionamiento_ventilacion_aire" etiqueta="13. Ventilación de aire generador" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_ventilacion_aire} onChange={setGE("ge_funcionamiento_ventilacion_aire")} />
          <ItemSelectFull campo="ge_funcionamiento_perdidas_aceite" etiqueta="14. Pérdidas aceite motor" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_perdidas_aceite} onChange={setGE("ge_funcionamiento_perdidas_aceite")} />
          <ItemSelectFull campo="ge_funcionamiento_perdidas_combustible" etiqueta="15. Pérdidas circuito combustible" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_perdidas_combustible} onChange={setGE("ge_funcionamiento_perdidas_combustible")} />
          <ItemSelectFull campo="ge_funcionamiento_restriccion_escape" etiqueta="16. Restricc. en el escape" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_restriccion_escape} onChange={setGE("ge_funcionamiento_restriccion_escape")} />
          <ItemSelectFull campo="ge_funcionamiento_restriccion_aire" etiqueta="17. Restricción en entrada y salida de aire" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_restriccion_aire} onChange={setGE("ge_funcionamiento_restriccion_aire")} />
           <ItemSelectFull campo="ge_funcionamiento_frecuencia" etiqueta="18. Frecuencia (medición)" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_frecuencia} onChange={setGE("ge_funcionamiento_frecuencia")} />
           <ItemSelectFull campo="ge_funcionamiento_tension_linea" etiqueta="19. Tensión de línea" opciones={OPCIONES_OPTIMO_BAJO_ALTO} valor={valoresGE.ge_funcionamiento_tension_linea} onChange={setGE("ge_funcionamiento_tension_linea")} />
          <div className="flex flex-col gap-1 bg-surface-container-low p-1.5 rounded">
            <span className="text-body-md font-body-md text-[12px]">20. Amperaje Fases</span>
            <div className="flex gap-2">
              {(["ge_funcionamiento_amperaje_f1", "ge_funcionamiento_amperaje_f2", "ge_funcionamiento_amperaje_f3"] as const).map((campo, i) => (
                <div key={campo} data-campo={campo} data-validation-label={`Amperaje F${i + 1}`} className="flex-1 flex items-center gap-1">
                  <span className="text-[10px]">F{i + 1}</span>
                  <input
                    className="input-technical w-full h-[22px] py-0 px-1 text-[11px] text-center text-data-mono font-data-mono"
                    type="number"
                    inputMode="decimal"
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="A"
                    value={valoresGE[campo] ?? ""}
                    onChange={(e) => setGE(campo)(e.target.value === "" ? null : Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
          <ItemSelectFull campo="ge_funcionamiento_tension_linea_carga" etiqueta="21. Tensión de línea con carga" opciones={OPCIONES_BAJA_ALTA} valor={valoresGE.ge_funcionamiento_tension_linea_carga} onChange={setGE("ge_funcionamiento_tension_linea_carga")} />
          <div data-campo="ge_funcionamiento_temp_ambiente" data-validation-label="22. Temperatura ambiente" className="flex justify-between items-center bg-surface-container-low p-1.5 rounded">
            <span className="text-body-md font-body-md text-[12px]">22. Temperatura ambiente</span>
            <input
              className="input-technical w-16 h-[22px] py-0 px-1 text-[11px] text-center text-data-mono font-data-mono"
              type="number"
              inputMode="decimal"
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="°C"
              value={valoresGE.ge_funcionamiento_temp_ambiente ?? ""}
              onChange={(e) => onChangeGE({ ge_funcionamiento_temp_ambiente: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
           <div data-campo="ge_funcionamiento_temp_refrigerante" data-validation-label="23. Temperatura líquido refrigerante" className="flex justify-between items-center bg-surface-container-low p-1.5 rounded">
             <span className="text-body-md font-body-md text-[12px]">23. Temperatura líquido refrigerante</span>
             <input
               className="input-technical w-16 h-[22px] py-0 px-1 text-[11px] text-center text-data-mono font-data-mono"
               type="number"
               inputMode="decimal"
               onWheel={(e) => e.currentTarget.blur()}
               placeholder="°C"
               value={valoresGE.ge_funcionamiento_temp_refrigerante ?? ""}
               onChange={(e) => onChangeGE({ ge_funcionamiento_temp_refrigerante: e.target.value === "" ? null : Number(e.target.value) })}
             />
           </div>
           <ItemSelectFull campo="ge_funcionamiento_inspeccion_bateria" etiqueta="24. Inspección de batería" opciones={OPCIONES_OK_MAL} valor={valoresGE.ge_funcionamiento_inspeccion_bateria} onChange={setGE("ge_funcionamiento_inspeccion_bateria")} />
           <ItemSelectFull campo="ge_funcionamiento_accion_electrico" etiqueta="25. Accionamiento de circ. eléctrico" opciones={OPCIONES_SI_NO} valor={valoresGE.ge_funcionamiento_accion_electrico} onChange={setGE("ge_funcionamiento_accion_electrico")} />
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
        <Seccion titulo="Valores" badge="Obligatorio" className="section-values-ge">
        <SeccionValoresGE valoresGE={valoresGE ?? valoresVaciosGE()} onChangeGE={onChangeGE} />
      </Seccion>
    );
  }

  const set = (campo: keyof ValoresBase) => (v: unknown) =>
    onChange({ [campo]: v } as Patch);

  const esSecadores = tipo === "secadores";
  const esCompresor = tipo === "compresor";
  const esMotocompresor = tipo === "motocompresor";
  const esVehiculo = tipo === "vehiculos" || tipo === "maquinas_viales";
  const esMaquinaVial = tipo === "maquinas_viales";

  const bloqueDetenido =
    aplica(tipo, "horometro") ||
    aplica(tipo, "aceite_motor") ||
    (tipo === "motocompresor" && aplica(tipo, "aceite_unidad")) ||
    aplica(tipo, "refrig_radiador") ||
    aplica(tipo, "estado_bateria") ||
    aplica(tipo, "conec_purga") ||
    aplica(tipo, "inst_electrica") ||
    aplica(tipo, "carroceria") ||
    aplica(tipo, "jabalina") ||
    aplica(tipo, "aislacion_suelo") ||
    esVehiculo;

  const bloqueNiveles =
    aplica(tipo, "aceite_motor") ||
    (tipo === "motocompresor" && aplica(tipo, "aceite_unidad")) ||
    aplica(tipo, "refrig_radiador") ||
    aplica(tipo, "estado_bateria") ||
    aplica(tipo, "conec_purga");

  const bloqueMarcha =
    aplica(tipo, "rpm_min") ||
    aplica(tipo, "tension_linea") ||
    aplica(tipo, "tension_gen_f1") ||
    aplica(tipo, "cons_carga_f1") ||
    aplica(tipo, "cons_descarga_f1") ||
    aplica(tipo, "temp_ambiente") ||
    aplica(tipo, "presion_unidad_comp") ||
    aplica(tipo, "circuito_refr_m") ||
    aplica(tipo, "circuito_seguridad") ||
    aplica(tipo, "circuito_electr");

  const bloquePerdidas =
    aplica(tipo, "perdida_aceite_motor") ||
    aplica(tipo, "perdida_refrigerante") ||
    aplica(tipo, "perdida_aire") ||
    aplica(tipo, "perdida_combustible");

  return (
    <Seccion titulo="Valores" badge="Obligatorio" className="section-values-standard">
      <div className="space-y-md">
        {bloqueDetenido ? (
          <div>
            <SubTitulo>Con Motor Detenido</SubTitulo>
            {aplica(tipo, "horometro") ? (
              <div className="mb-sm">
                <CampoNumero campo="horometro" etiqueta="Horómetro" sufijo="HRS" texto valor={valores.horometro} onChange={set("horometro")} />
              </div>
            ) : null}
            {aplica(tipo, "kilometros") ? (
              <div className="mb-sm">
                <CampoNumero campo="kilometros" etiqueta="Kilómetros" sufijo="KM" valor={valores.kilometros} onChange={set("kilometros")} />
              </div>
            ) : null}
            {bloqueNiveles ? <div className="grid grid-cols-2 gap-sm mb-sm border-b border-outline-variant pb-sm">
              <GrupoTitulo>NIVELES</GrupoTitulo>
              {aplica(tipo, "aceite_motor") ? (
                <ItemSelect campo="aceite_motor" etiqueta="Aceite Motor" opciones={OPCIONES_NIVEL} valor={valores.aceite_motor} onChange={set("aceite_motor")} />
              ) : null}
              {tipo === "motocompresor" && aplica(tipo, "aceite_unidad") ? (
                <ItemSelect campo="aceite_unidad" etiqueta="Aceite Unidad" opciones={OPCIONES_NIVEL} valor={valores.aceite_unidad} onChange={set("aceite_unidad")} />
              ) : null}
              {aplica(tipo, "refrig_radiador") ? (
                <ItemSelect campo="refrig_radiador" etiqueta="Refrig. Rad." opciones={OPCIONES_NIVEL} valor={valores.refrig_radiador} onChange={set("refrig_radiador")} />
              ) : null}
              {aplica(tipo, "estado_bateria") ? (
                 <ItemSelect campo="estado_bateria" etiqueta="Est. Batería" opciones={tipo === "motocompresor" ? OPCIONES_OK_MAL_NO_TIENE : OPCIONES_OK_MAL} valor={valores.estado_bateria} onChange={set("estado_bateria")} />
              ) : null}
              {aplica(tipo, "conec_purga") ? (
                   <ItemSelect campo="conec_purga" className={esSecadores ? "field-mobile-wide" : ""} etiqueta={esSecadores ? "Conexión de purga" : "Conec. Purga"} opciones={OPCIONES_SI_NO} valor={valores.conec_purga} onChange={set("conec_purga")} />
              ) : null}
              {esVehiculo ? (
                <>
                  <ItemSelect campo="aceite_caja" etiqueta="Aceite Caja" opciones={OPCIONES_OPTIMO_ALTO_BAJO} valor={valores.aceite_caja} onChange={set("aceite_caja")} />
                  <ItemSelect campo="aceite_diferencial" etiqueta="Aceite Diferencial" opciones={OPCIONES_OPTIMO_ALTO_BAJO} valor={valores.aceite_diferencial} onChange={set("aceite_diferencial")} />
                  {esMaquinaVial ? (
                    <>
                      <ItemSelect campo="aceite_hidraulico" etiqueta="Aceite Hidráulico" opciones={OPCIONES_OPTIMO_ALTO_BAJO} valor={valores.aceite_hidraulico} onChange={set("aceite_hidraulico")} />
                      <ItemSelect campo="aceite_convertidor" etiqueta="Aceite Convertidor" opciones={OPCIONES_OPTIMO_ALTO_BAJO} valor={valores.aceite_convertidor} onChange={set("aceite_convertidor")} />
                    </>
                  ) : null}
                </>
              ) : null}
            </div> : null}
            <div className="grid grid-cols-2 gap-sm">
              <GrupoTitulo>ESTADO GENERAL</GrupoTitulo>
              {aplica(tipo, "inst_electrica") ? (
                  <ItemSelect campo="inst_electrica" className={esSecadores ? "field-mobile-wide" : ""} etiqueta="Instalación eléctrica" opciones={OPCIONES_OK_MAL} valor={valores.inst_electrica} onChange={set("inst_electrica")} />
              ) : null}
              {aplica(tipo, "carroceria") ? (
                  <ItemSelect campo="carroceria" etiqueta="Carrocería" opciones={OPCIONES_OK_MAL} valor={valores.carroceria} onChange={set("carroceria")} />
              ) : null}
              {aplica(tipo, "jabalina") ? (
                  <ItemSelect campo="jabalina" className={esSecadores ? "field-mobile-wide" : ""} etiqueta={esSecadores ? "Conexión de jabalina" : "Jabalina"} opciones={OPCIONES_SI_NO} valor={valores.jabalina} onChange={set("jabalina")} />
              ) : null}
              {aplica(tipo, "aislacion_suelo") ? (
                  <ItemSelect campo="aislacion_suelo" className={esSecadores ? "field-mobile-wide" : ""} etiqueta={esSecadores ? "Aislación de suelo" : "Aislac. Suelo"} opciones={OPCIONES_SI_NO} valor={valores.aislacion_suelo} onChange={set("aislacion_suelo")} />
              ) : null}
            </div>
          </div>
        ) : null}

        {bloqueMarcha ? (
          <div className="pt-sm border-t border-outline-variant">
            <SubTitulo>Con Motor en Marcha</SubTitulo>
            {aplica(tipo, "rpm_min") ? (
              <div className="grid grid-cols-2 gap-sm mb-sm border-b border-outline-variant pb-sm">
                <CampoNumero campo="rpm_min" etiqueta="RPM Min" valor={valores.rpm_min} onChange={set("rpm_min")} />
                <CampoNumero campo="rpm_max" etiqueta="RPM Max" valor={valores.rpm_max} onChange={set("rpm_max")} />
              </div>
            ) : null}
            {aplica(tipo, "tension_linea") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TENSIÓN DE LÍNEA (V)</h4>
                   <CampoNumero campo="tension_linea" etiqueta={esSecadores ? "" : "Voltaje General"} centrado valor={valores.tension_linea} onChange={set("tension_linea")} />
              </div>
            ) : null}
            {aplica(tipo, "tension_gen_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TENSIÓN DE GEN. (V)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["tension_gen_f1", "tension_gen_f2", "tension_gen_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} campo={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "cons_carga_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">CONS. EN CARGA (A)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["cons_carga_f1", "cons_carga_f2", "cons_carga_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} campo={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "cons_descarga_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">CONS. EN DESCARGA (A)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["cons_descarga_f1", "cons_descarga_f2", "cons_descarga_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} campo={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "temp_ambiente") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                 <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TEMPERATURA (°C)</h4>
                 <div className="grid grid-cols-2 gap-sm">
                   <CampoNumero campo="temp_ambiente" etiqueta={esCompresor ? "Temperatura de unidad" : "Ambiente"} valor={valores.temp_ambiente} onChange={set("temp_ambiente")} />
                   {aplica(tipo, "temp_refrigerante") ? (
                     <CampoNumero campo="temp_refrigerante"
                       etiqueta="Refrigerante"
                       valor={valores.temp_refrigerante}
                       onChange={set("temp_refrigerante")}
                     />
                   ) : null}
                   {aplica(tipo, "pto_rocio") ? (
                  <ItemSelect campo="pto_rocio" className={esSecadores ? "field-mobile-wide" : ""} etiqueta="Punto de rocío" opciones={OPCIONES_OPTIMO_ALTO_BAJO} valor={valores.pto_rocio} onChange={set("pto_rocio")} />
                   ) : null}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "presion_unidad_comp") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">PRESIÓN</h4>
                <div className="grid grid-cols-2 gap-sm">
                  <CampoNumero campo="presion_unidad_comp" etiqueta="Unid. Comp." valor={valores.presion_unidad_comp} onChange={set("presion_unidad_comp")} />
                  {aplica(tipo, "presion_aceite_motor") ? (
                    <ItemSelect campo="presion_aceite_motor" etiqueta="Aceite Motor" opciones={OPCIONES_OK_BAJO} valor={valores.presion_aceite_motor} onChange={set("presion_aceite_motor")} />
                  ) : null}
                </div>
              </div>
            ) : null}
            {aplica(tipo, "circuito_refr_m") || aplica(tipo, "circuito_seguridad") || aplica(tipo, "circuito_electr") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">FUNCIONAMIENTO CIRCUITO</h4>
                <div className="grid grid-cols-2 gap-sm">
                   {aplica(tipo, "circuito_refr_m") ? <ItemSelect campo="circuito_refr_m" etiqueta="Refr. M." opciones={OPCIONES_OK_MAL} valor={valores.circuito_refr_m} onChange={set("circuito_refr_m")} /> : null}
                   {aplica(tipo, "circuito_despresuriz") ? <ItemSelect campo="circuito_despresuriz" etiqueta="Despresuriz." opciones={OPCIONES_SI_NO} valor={valores.circuito_despresuriz} onChange={set("circuito_despresuriz")} /> : null}
                   {aplica(tipo, "circuito_arranque") ? <ItemSelect campo="circuito_arranque" etiqueta="Arranque" opciones={OPCIONES_OK_MAL} valor={valores.circuito_arranque} onChange={set("circuito_arranque")} /> : null}
                    {aplica(tipo, "circuito_seguridad") ? <ItemSelect campo="circuito_seguridad" etiqueta="Seguridad" opciones={OPCIONES_OK_MAL} valor={valores.circuito_seguridad} onChange={set("circuito_seguridad")} /> : null}
                    {aplica(tipo, "circuito_electr") ? <ItemSelect campo="circuito_electr" etiqueta="Eléctrico" opciones={OPCIONES_OK_MAL} valor={valores.circuito_electr} onChange={set("circuito_electr")} /> : null}
                   {aplica(tipo, "tiempo_y_delta") ? <ItemSelect campo="tiempo_y_delta" etiqueta="Tiempo Y-Δ" opciones={OPCIONES_TIEMPO_Y_DELTA} valor={valores.tiempo_y_delta} onChange={set("tiempo_y_delta")} /> : null}
                   {aplica(tipo, "diferencial") ? <ItemSelect campo="diferencial" etiqueta="Diferencial" opciones={OPCIONES_OK_NO} valor={valores.diferencial} onChange={set("diferencial")} /> : null}
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
                  <ItemSelect campo="perdida_aceite_motor" etiqueta={esMotocompresor ? "Aceite Unidad" : tipo === "compresor" ? "Pérdida de aceite de unidad" : "Aceite Motor"} opciones={OPCIONES_SI_NO} valor={valores.perdida_aceite_motor} onChange={set("perdida_aceite_motor")} />
               ) : null}
              {aplica(tipo, "perdida_refrigerante") ? (
                  <ItemSelect campo="perdida_refrigerante" etiqueta="Refrigerante" opciones={OPCIONES_SI_NO} valor={valores.perdida_refrigerante} onChange={set("perdida_refrigerante")} />
              ) : null}
              {aplica(tipo, "perdida_aire") ? (
                <ItemSelect campo="perdida_aire" etiqueta="Aire" opciones={OPCIONES_SI_NO} valor={valores.perdida_aire} onChange={set("perdida_aire")} />
              ) : null}
              {aplica(tipo, "perdida_combustible") ? (
                <ItemSelect campo="perdida_combustible" etiqueta="Combustible" opciones={OPCIONES_SI_NO} valor={valores.perdida_combustible} onChange={set("perdida_combustible")} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Seccion>
  );
}
