"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/useSesion";
import { db } from "@/lib/db";
import {
  CAMPO_LABELS,
  CAMPOS_POR_TIPO,
  cargarAnexa,
  cargarAnexaGE,
  formatNumero,
  guardarBorrador,
  valoresVacios,
  valoresVaciosGE,
} from "@/lib/informes";
import { intentarSync } from "@/lib/sync";
import { traerInformeRemoto } from "@/lib/remoto";
import type { InformeGeneral, InformeGrupoElectrogeno, ValoresBase } from "@/lib/types";
import { Divisor } from "@/components/ui";
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

export default function InformePage(props: PageProps<"/informe/[id]">) {
  const { id } = use(props.params);
  const { cargando } = useSesion(true);
  const router = useRouter();
  const [informe, setInforme] = useState<InformeGeneral | null>(null);
  const [valores, setValores] = useState<ValoresBase>(valoresVacios);
  const [valoresGE, setValoresGE] = useState<InformeGrupoElectrogeno | null>(null);
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estadoRef = useRef<{
    informe: InformeGeneral | null;
    valores: ValoresBase;
    valoresGE: InformeGrupoElectrogeno | null;
  }>({
    informe: null,
    valores: valoresVacios(),
    valoresGE: null,
  });

  useEffect(() => {
    let activo = true;
    setFallo(false);
    (async () => {
      let inf = await db.informes.get(id).catch(() => undefined);
      if (!inf) {
        const traido = await traerInformeRemoto(id).catch(() => false);
        if (traido) inf = await db.informes.get(id).catch(() => undefined);
      }
      if (!inf) {
        if (activo) setFallo(true);
        return;
      }
      const anexa = await cargarAnexa(inf.tipo_equipo, inf.id);
      let anexaGE: InformeGrupoElectrogeno | null = null;
      if (inf.tipo_equipo === "grupo_electrogeno") {
        anexaGE = await cargarAnexaGE(inf.id);
      }
      if (!activo) return;
      const val = { ...valoresVacios(), ...anexa };
      estadoRef.current = { informe: inf, valores: val, valoresGE: anexaGE };
      setInforme(inf);
      setValores(val);
      setValoresGE(anexaGE);
    })();
    return () => {
      activo = false;
    };
  }, [id, cargando, intento]);

  function programarGuardado() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { informe: inf, valores: val, valoresGE: ge } = estadoRef.current;
      if (inf) void guardarBorrador(inf, val, inf.tipo_equipo === "grupo_electrogeno" ? ge : undefined);
    }, 500);
  }

  function patchInforme(p: Partial<InformeGeneral>) {
    setInforme((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      estadoRef.current.informe = next;
      programarGuardado();
      return next;
    });
  }

  function patchValores(p: Partial<ValoresBase>) {
    setValores((prev) => {
      const next = { ...prev, ...p };
      estadoRef.current.valores = next;
      programarGuardado();
      return next;
    });
  }

  function patchValoresGE(p: Partial<InformeGrupoElectrogeno>) {
    setValoresGE((prev) => {
      const base = prev ?? valoresVaciosGE();
      const next = { ...base, ...p };
      estadoRef.current.valoresGE = next;
      programarGuardado();
      return next;
    });
  }

  async function enviar() {
    if (timer.current) clearTimeout(timer.current);
    const { informe: inf, valores: val, valoresGE: ge } = estadoRef.current;
    if (!inf) return;
    const faltantes: string[] = [];
    if (!inf.cliente_nombre.trim()) faltantes.push("Cliente / Empresa");
    if (inf.horas_trabajadas === null) faltantes.push("Total Horas Trabajadas");
    if (inf.maquina_operativa === null) faltantes.push("¿La máquina queda operativa?");
    if (inf.tipo_equipo !== "grupo_electrogeno" && inf.tipo_equipo !== "extraordinarios") {
      for (const campo of CAMPOS_POR_TIPO[inf.tipo_equipo]) {
        if (val[campo] === null) faltantes.push(CAMPO_LABELS[campo]);
      }
    }
    const fotos = await db.archivos.where({ informe_id: inf.id, tipo: "foto" }).count();
    if (fotos === 0) faltantes.push("Registro Fotográfico (mínimo 1 foto)");
    if (faltantes.length > 0) {
      alert(`Completá los campos obligatorios:\n- ${faltantes.join("\n- ")}`);
      return;
    }
    const cerrado = inf.estado_firma === "firmado";
    const guardado = {
      ...inf,
      estado_sync: "pendiente" as const,
      cerrado: inf.cerrado || cerrado,
    };
    estadoRef.current.informe = guardado;
    setInforme(guardado);
    await guardarBorrador(guardado, val, inf.tipo_equipo === "grupo_electrogeno" ? ge : undefined);
    intentarSync();
    alert(
      cerrado
        ? "Informe enviado y cerrado. Si hay conexión, se está sincronizando con el servidor."
        : "Informe guardado sin firma de cliente. Queda editable y se sincronizará con el servidor."
    );
    router.push("/");
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
          <Link
            href="/"
            className="border border-outline-variant rounded px-md py-1 text-[13px]"
          >
            Volver al listado
          </Link>
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
    <div className="pt-12 pb-xl">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin h-12 bg-primary text-on-primary border-b border-primary-container shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-title-md font-title-md font-bold tracking-tight">
            Informe Técnico № {formatNumero(informe.numero_registro)}
          </h1>
        </div>
        <button
          type="button"
          className="text-label-caps font-label-caps font-bold tracking-wider hover:bg-primary-container transition-colors px-3 py-1.5 rounded"
          onClick={enviar}
        >
          ENVIAR
        </button>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
        <div className="bg-white border-b border-outline-variant px-md py-1 flex justify-between items-center mb-md shadow-sm">
          <span className="text-title-md font-title-md font-bold text-primary">AIR POWER S.A.</span>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
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
