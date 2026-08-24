import type { TipoEquipo, ValoresBase } from "@/lib/types";
import { aplica } from "@/lib/informes";
import {
  CampoNumero,
  CampoTexto,
  GrupoTitulo,
  ItemSelect,
  OPCIONES_NIVEL,
  OPCIONES_SI_NO,
  SubTitulo,
} from "@/components/ui";

type Patch = Partial<ValoresBase>;

export default function SeccionValores({
  tipo,
  valores,
  onChange,
}: {
  tipo: TipoEquipo;
  valores: ValoresBase;
  onChange: (p: Patch) => void;
}) {
  if (tipo === "extraordinarios") return null;

  const set = (campo: keyof ValoresBase) => (v: unknown) =>
    onChange({ [campo]: v } as Patch);

  const niveles = tipo === "vehiculos" ? OPCIONES_NIVEL : OPCIONES_SI_NO;
  const esVehiculos = tipo === "vehiculos";
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
    aplica(tipo, "tension_linea_f1") ||
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
    <section className="mb-lg bg-white shadow-sm border border-outline-variant mx-4 md:mx-0 rounded-lg overflow-hidden">
      <div className="bg-primary-container text-on-primary py-1 px-md flex items-center justify-between mb-sm">
        <h2 className="text-title-md font-title-md font-bold uppercase tracking-wider text-[13px]">
          VALORES
        </h2>
        {tipo !== "grupo_electrogeno" ? (
          <span className="required-badge">Obligatorio</span>
        ) : null}
      </div>
      <div className="p-md space-y-md">
        {tipo === "grupo_electrogeno" ? (
          <p className="text-body-md text-on-surface-variant italic">
            Formato de grupo electrógeno pendiente de definición.
          </p>
        ) : null}

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
                <ItemSelect etiqueta="Aceite Motor" opciones={niveles} valor={valores.aceite_motor} onChange={set("aceite_motor")} />
              ) : null}
              {aplica(tipo, "aceite_unidad") ? (
                <ItemSelect etiqueta="Aceite Unidad" opciones={OPCIONES_SI_NO} valor={valores.aceite_unidad} onChange={set("aceite_unidad")} />
              ) : null}
              {aplica(tipo, "refrig_radiador") ? (
                <ItemSelect etiqueta="Refrig. Rad." opciones={niveles} valor={valores.refrig_radiador} onChange={set("refrig_radiador")} />
              ) : null}
              {aplica(tipo, "estado_bateria") ? (
                <ItemSelect etiqueta="Est. Batería" opciones={esVehiculos ? niveles : OPCIONES_SI_NO} valor={valores.estado_bateria} onChange={set("estado_bateria")} />
              ) : null}
              {aplica(tipo, "conec_purga") ? (
                <ItemSelect etiqueta="Conec. Purga" opciones={OPCIONES_SI_NO} valor={valores.conec_purga} onChange={set("conec_purga")} />
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <GrupoTitulo>ESTADO GENERAL</GrupoTitulo>
              {aplica(tipo, "inst_electrica") ? (
                <ItemSelect etiqueta="Inst. Eléctrica" opciones={OPCIONES_SI_NO} valor={valores.inst_electrica} onChange={set("inst_electrica")} />
              ) : null}
              {aplica(tipo, "carroceria") ? (
                <ItemSelect etiqueta="Carrocería" opciones={OPCIONES_SI_NO} valor={valores.carroceria} onChange={set("carroceria")} />
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
            {aplica(tipo, "tension_linea_f1") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">TENSIÓN DE LÍNEA (V)</h4>
                <div className="grid grid-cols-3 gap-sm">
                  {(["tension_linea_f1", "tension_linea_f2", "tension_linea_f3"] as const).map((c, i) => (
                    <CampoNumero key={c} etiqueta={`F${i + 1}`} centrado valor={valores[c]} onChange={set(c)} />
                  ))}
                </div>
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
                  <CampoNumero etiqueta="Aceite Motor" valor={valores.presion_aceite_motor} onChange={set("presion_aceite_motor")} />
                </div>
              </div>
            ) : null}
            {aplica(tipo, "circuito_refr_m") ? (
              <div className="mb-sm border-b border-outline-variant pb-sm">
                <h4 className="text-[10px] font-bold text-on-surface-variant mb-xs">FUNCIONAMIENTO CIRCUITO</h4>
                <div className="grid grid-cols-2 gap-sm">
                  <ItemSelect etiqueta="Refr. M." opciones={OPCIONES_SI_NO} valor={valores.circuito_refr_m} onChange={set("circuito_refr_m")} />
                  <ItemSelect etiqueta="Despresuriz." opciones={OPCIONES_SI_NO} valor={valores.circuito_despresuriz} onChange={set("circuito_despresuriz")} />
                  <ItemSelect etiqueta="Arranque" opciones={OPCIONES_SI_NO} valor={valores.circuito_arranque} onChange={set("circuito_arranque")} />
                  <ItemSelect etiqueta="Seguridad" opciones={OPCIONES_SI_NO} valor={valores.circuito_seguridad} onChange={set("circuito_seguridad")} />
                  <ItemSelect etiqueta="Electr." opciones={OPCIONES_SI_NO} valor={valores.circuito_electr} onChange={set("circuito_electr")} />
                  <CampoTexto etiqueta="Tiempo Y-Δ" valor={valores.tiempo_y_delta} onChange={set("tiempo_y_delta")} />
                  <CampoTexto etiqueta="Diferencial" valor={valores.diferencial} onChange={set("diferencial")} />
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
    </section>
  );
}
