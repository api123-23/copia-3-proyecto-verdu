"use client";

import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/lib/useSesion";
import { db } from "@/lib/db";
import {
  CAMPO_LABELS,
  CAMPO_LABELS_GE,
  CAMPOS_GE,
  CAMPOS_POR_TIPO,
  cargarAnexa,
  cargarAnexaGE,
  formatNumero,
  guardarBorrador,
  valoresVacios,
  valoresVaciosGE,
} from "@/lib/informes";
import { intentarSync } from "@/lib/sync";
import { Icono } from "@/components/Icono";
import { traerInformeRemoto } from "@/lib/remoto";
import { navegar } from "@/lib/hashRuta";
import type { InformeGeneral, InformeGrupoElectrogeno, ValoresBase } from "@/lib/types";
import { Divisor } from "@/components/ui";
import { LogoTipo } from "@/components/LogoTipo";
import {
  SeccionCliente,
  SeccionTrabajos,
  SeccionHoras,
  SeccionRepuestos,
  SeccionCotizacion,
  SeccionOperativa,
} from "@/components/informe/secciones";
import SeccionValores from "@/components/informe/SeccionValores";
import SeccionFotos from "@/components/informe/SeccionFotos";
import SeccionFirmas from "@/components/informe/SeccionFirmas";

export function EditorInforme({ id }: { id: string }) {
  const { cargando } = useSesion(false);
  const [informe, setInforme] = useState<InformeGeneral | null>(null);
  const [valores, setValores] = useState<ValoresBase>(valoresVacios);
  const [valoresGE, setValoresGE] = useState<InformeGrupoElectrogeno>(valoresVaciosGE());
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const sucioRef = useRef(false);
  const estadoRef = useRef<{
    informe: InformeGeneral | null;
    valores: ValoresBase;
    valoresGE: InformeGrupoElectrogeno;
  }>({
    informe: null,
    valores: valoresVacios(),
    valoresGE: valoresVaciosGE(),
  });

  useEffect(() => {
    let activo = true;
    (async () => {
      let inf = await db.informes.get(id).catch(() => undefined);
      if (!inf) {
        const traido = await traerInformeRemoto(id).catch(() => false);
        if (traido) inf = await db.informes.get(id).catch(() => undefined);
      }
      if (!inf) {
        const crudo = sessionStorage.getItem("verdu-nuevo");
        if (crudo) {
          try {
            const candidato = JSON.parse(crudo) as InformeGeneral;
            if (candidato.id === id) inf = candidato;
          } catch {
            /* sesión corrupta; se ignora */
          }
        }
      }
      if (!inf) {
        if (activo) setFallo(true);
        return;
      }
      const anexa = await cargarAnexa(inf.tipo_equipo, inf.id);
      let anexaGE = valoresVaciosGE();
      if (inf.tipo_equipo === "grupo_electrogeno") {
        anexaGE = await cargarAnexaGE(inf.id);
      }
      if (!activo) return;
      const val = { ...valoresVacios(), ...anexa };
      estadoRef.current = { informe: inf, valores: val, valoresGE: anexaGE };
      sucioRef.current = false;
      setFallo(false);
      setInforme(inf);
      setValores(val);
      setValoresGE(anexaGE);
    })();
    return () => {
      activo = false;
    };
  }, [id, cargando, intento]);

  function patchInforme(p: Partial<InformeGeneral>) {
    sucioRef.current = true;
    setInforme((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      estadoRef.current.informe = next;
      return next;
    });
  }

  function patchValores(p: Partial<ValoresBase>) {
    sucioRef.current = true;
    setValores((prev) => {
      const next = { ...prev, ...p };
      estadoRef.current.valores = next;
      return next;
    });
  }

  function patchValoresGE(p: Partial<InformeGrupoElectrogeno>) {
    sucioRef.current = true;
    setValoresGE((prev) => {
      const next = { ...prev, ...p };
      estadoRef.current.valoresGE = next;
      return next;
    });
  }

  async function enviar() {
    const { informe: inf, valores: val, valoresGE: ge } = estadoRef.current;
    if (!inf) return;
    const faltantes: string[] = [];
    if (!inf.cliente_nombre.trim()) faltantes.push("Cliente / Empresa");
    if (inf.horas_trabajadas === null) faltantes.push("Total Horas Trabajadas");
    if (inf.maquina_operativa === null) faltantes.push("¿La máquina queda operativa?");
    if (inf.tipo_equipo !== "extraordinarios") {
      if (inf.tipo_equipo === "grupo_electrogeno") {
        for (const campo of CAMPOS_GE) {
          if (campo === "informe_id") continue;
          if (ge[campo] === null || ge[campo] === undefined) faltantes.push(CAMPO_LABELS_GE[campo]);
        }
      } else {
        for (const campo of CAMPOS_POR_TIPO[inf.tipo_equipo]) {
          if (val[campo] === null) faltantes.push(CAMPO_LABELS[campo]);
        }
      }
    }
    const fotos = await db.archivos.where({ informe_id: inf.id, tipo: "foto" }).count();
    if (fotos === 0) faltantes.push("Registro Fotográfico (mínimo 1 foto)");
    if (faltantes.length > 0) {
      alert(`Completá los campos obligatorios:\n- ${faltantes.join("\n- ")}`);
      return;
    }
    const cerrado = inf.estado_firma === "firmado";
    const yaSincronizado = inf.estado_sync === "sincronizado";
    const archivosPendientes = await db.archivos
      .where("informe_id")
      .equals(inf.id)
      .filter((a) => a.estado_sync !== "sincronizado")
      .count();
    const hayCambios = sucioRef.current || archivosPendientes > 0;
    const resincronizar = !yaSincronizado || hayCambios;
    const guardado = {
      ...inf,
      estado_sync: resincronizar ? ("pendiente" as const) : ("sincronizado" as const),
      cerrado: inf.cerrado || cerrado,
    };
    estadoRef.current.informe = guardado;
    setInforme(guardado);
    await guardarBorrador(guardado, val, inf.tipo_equipo === "grupo_electrogeno" ? ge : undefined);
    if (resincronizar) intentarSync();
    navegar("#/");
  }

  if (fallo) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-md px-margin">
        <p className="text-body-lg text-on-surface-variant text-center">
          No se pudo cargar el informe. Verificá tu conexión o reintentá.
        </p>
        <div className="flex gap-sm">
          <button
            type="button"
            className="bg-primary text-on-primary rounded px-md py-1 text-[13px] font-bold uppercase tracking-wider"
            onClick={() => setIntento((i) => i + 1)}
          >
            Reintentar
          </button>
          <a
            href="#/"
            className="border border-outline-variant rounded px-md py-1 text-[13px]"
          >
            Volver al listado
          </a>
        </div>
      </main>
    );
  }

  if (!informe) {
    return <p className="p-margin text-on-surface-variant">Cargando informe...</p>;
  }

  const fecha = new Date(informe.fecha_hora).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div
      className="pb-xl"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)",
      }}
    >
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin bg-primary text-on-primary border-b border-primary-container shadow-sm"
        style={{
          minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-2">
          <a
            href="#/"
            className="hover:bg-primary-container active:scale-95 transition-all px-2 py-1 rounded"
            aria-label="Volver al listado"
          >
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Informe Técnico № {formatNumero(informe.numero_registro)}
          </h1>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-label-caps font-label-caps font-bold tracking-wider hover:bg-primary-container active:scale-95 transition-all px-3 py-1.5 rounded"
          onClick={enviar}
        >
          ENVIAR
          <Icono nombre="send" className="w-[16px] h-[16px]" />
        </button>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
        <div className="bg-white border-b border-outline-variant px-md py-1 flex items-center justify-between mb-md shadow-sm">
          <span className="flex items-center gap-2 text-title-md font-title-md font-bold text-primary">
            <LogoTipo className="w-5 h-5 rounded" />
            AIR POWER S.A.
          </span>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Icono nombre="calendar_today" className="w-[16px] h-[16px]" />
            <span className="text-body-md font-body-md text-[12px]">{fecha}</span>
          </div>
        </div>

        <fieldset disabled={informe.cerrado} className="m-0 min-w-0 border-0 p-0">
          <SeccionCliente informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionTrabajos informe={informe} onChange={patchInforme} />
          <SeccionValores
            tipo={informe.tipo_equipo}
            valores={valores}
            onChange={patchValores}
            valoresGE={valoresGE}
            onChangeGE={patchValoresGE}
          />
          <Divisor />
          <SeccionOperativa informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionHoras informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionRepuestos informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionCotizacion informe={informe} onChange={patchInforme} />
          <Divisor />
          <SeccionFotos informeId={informe.id} cerrado={informe.cerrado} />
          <Divisor />
          <SeccionFirmas informe={informe} onChange={patchInforme} />
        </fieldset>
      </main>
    </div>
  );
}