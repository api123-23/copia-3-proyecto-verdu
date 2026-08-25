"use client";

import { useEffect, useRef, useState, use } from "react";
import { useSesion } from "@/lib/useSesion";
import { db } from "@/lib/db";
import {
  CAMPO_LABELS,
  CAMPOS_POR_TIPO,
  cargarAnexa,
  formatNumero,
  guardarBorrador,
  valoresVacios,
} from "@/lib/informes";
import { intentarSync } from "@/lib/sync";
import { traerInformeRemoto } from "@/lib/remoto";
import type { InformeGeneral, ValoresBase } from "@/lib/types";
import { Divisor } from "@/components/ui";
import {
  SeccionCliente,
  SeccionTrabajos,
  SeccionHoras,
  SeccionRepuestos,
  SeccionCotizacion,
} from "@/components/informe/secciones";
import SeccionValores from "@/components/informe/SeccionValores";
import SeccionFotos from "@/components/informe/SeccionFotos";
import SeccionFirmas from "@/components/informe/SeccionFirmas";

export default function InformePage(props: PageProps<"/informe/[id]">) {
  const { id } = use(props.params);
  useSesion(true);
  const [informe, setInforme] = useState<InformeGeneral | null>(null);
  const [valores, setValores] = useState<ValoresBase>(valoresVacios);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estadoRef = useRef<{ informe: InformeGeneral | null; valores: ValoresBase }>({
    informe: null,
    valores,
  });

  useEffect(() => {
    let activo = true;
    (async () => {
      let inf = await db.informes.get(id);
      if (!inf) {
        const traido = await traerInformeRemoto(id).catch(() => false);
        if (traido) inf = await db.informes.get(id);
      }
      if (!inf || !activo) return;
      const anexa = await cargarAnexa(inf.tipo_equipo, inf.id);
      if (!activo) return;
      estadoRef.current = { informe: inf, valores: { ...valoresVacios(), ...anexa } };
      setInforme(inf);
      setValores(estadoRef.current.valores);
    })();
    return () => {
      activo = false;
    };
  }, [id]);

  function programarGuardado() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { informe: inf, valores: val } = estadoRef.current;
      if (inf) void guardarBorrador(inf, val);
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

  async function enviar() {
    if (timer.current) clearTimeout(timer.current);
    const { informe: inf, valores: val } = estadoRef.current;
    if (!inf) return;
    const faltantes: string[] = [];
    if (!inf.cliente_nombre.trim()) faltantes.push("Cliente / Empresa");
    if (inf.horas_trabajadas === null) faltantes.push("Total Horas Trabajadas");
    if (inf.maquina_operativa === null) faltantes.push("¿La máquina queda operativa?");
    for (const campo of CAMPOS_POR_TIPO[inf.tipo_equipo]) {
      if (val[campo] === null) faltantes.push(CAMPO_LABELS[campo]);
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
    await guardarBorrador(guardado, val);
    intentarSync();
    alert(
      cerrado
        ? "Informe enviado y cerrado. Si hay conexión, se está sincronizando con el servidor."
        : "Informe guardado sin firma de cliente. Queda editable y se sincronizará con el servidor."
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
          <SeccionValores tipo={informe.tipo_equipo} valores={valores} onChange={patchValores} />
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
