"use client";

import { useEffect, useRef, useState, use } from "react";
import { useSesion } from "@/lib/useSesion";
import { db } from "@/lib/db";
import { cargarAnexa, guardarBorrador, valoresVacios } from "@/lib/informes";
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
      const inf = await db.informes.get(id);
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

  function enviar() {
    if (timer.current) clearTimeout(timer.current);
    const { informe: inf, valores: val } = estadoRef.current;
    if (!inf) return;
    if (!inf.cliente_nombre.trim()) {
      alert("El nombre del cliente es obligatorio.");
      return;
    }
    void guardarBorrador({ ...inf, estado_sync: "pendiente" }, val);
    alert("Informe guardado localmente. Se sincronizará al recuperar conexión.");
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
            Informe Técnico № {informe.numero_registro ?? "—"}
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
        <SeccionFotos informeId={informe.id} />
        <Divisor />
        <SeccionFirmas informe={informe} onChange={patchInforme} />
      </main>
    </div>
  );
}
