"use client";

import { useSesion } from "@/lib/useSesion";
import { navegar, useHash, parsearRuta } from "@/lib/hashRuta";
import { ListaInformes } from "@/components/ListaInformes";
import { EditorInforme } from "@/components/informe/EditorInforme";
import { VistaPdfInforme } from "@/components/informe/VistaPdfInforme";
import { NuevoInforme } from "@/components/informe/NuevoInforme";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { PantallaCarga } from "@/components/PantallaCarga";
import { AvisoSyncActivo } from "@/components/AvisoSyncActivo";
import { ReLogin } from "@/components/ReLogin";
import { MenuPerfil } from "@/components/MenuPerfil";
import { PanelAdmin } from "@/components/PanelAdmin";
import { GestionClientes } from "@/components/GestionClientes";
import { Estadisticas } from "@/components/Estadisticas";
import { usePerfil } from "@/lib/usePerfil";
import { useEffect, useState } from "react";
import { Tutorial } from "@/components/Tutorial";
import { debeMostrarse, iniciarRecorrido } from "@/lib/tutorial";
import { useEstadoSesion } from "@/lib/reautenticacion";
import { useEnLinea } from "@/lib/useEnLinea";

export default function Home() {
  const { cargando, sesion } = useSesion(true);
  const { esMaster, esObservador } = usePerfil();
  const hash = useHash();
  const ruta = parsearRuta(hash);
  const vistaKey = `${ruta.tipo}-${"id" in ruta ? ruta.id : ""}`;

  // ESTADÍSTICAS necesita conexión: sin señal el botón queda apagado y, al
  // volver, recupera su color con una animación.
  const enLinea = useEnLinea();
  const [estuvoSinConexion, setEstuvoSinConexion] = useState(false);
  if (!enLinea && !estuvoSinConexion) setEstuvoSinConexion(true);

  useEffect(() => {
    if (esObservador && ["admin", "clientes", "estadisticas", "nuevo"].includes(ruta.tipo)) navegar("#/");
  }, [esObservador, ruta.tipo]);

  // Tutorial de la pantalla principal: solo si la cuenta confirma que nunca se vio
  // (con sesión validada y conexión; ante cualquier duda no aparece).
  const uid = sesion?.user?.id ?? null;
  const estadoSesion = useEstadoSesion();
  useEffect(() => {
    if (!uid || ruta.tipo !== "lista" || estadoSesion !== "ok") return;
    let vigente = true;
    const t = window.setTimeout(async () => {
      if (vigente && (await debeMostrarse(uid, "lista")) && vigente) iniciarRecorrido("lista");
    }, 1500);
    return () => {
      vigente = false;
      window.clearTimeout(t);
    };
  }, [uid, ruta.tipo, estadoSesion]);

  if (cargando || !sesion) {
    return <PantallaCarga mensaje="Cargando..." />;
  }

  return (
    <>
      <AvisoSyncActivo />
      <ReLogin sesion={sesion} />
      <Tutorial uid={uid} />
      <div key={vistaKey} className="view-transition">
      {ruta.tipo === "admin" ? (
        <PanelAdmin />
      ) : ruta.tipo === "clientes" ? (
        <GestionClientes />
      ) : ruta.tipo === "nuevo" ? (
        esObservador ? <ListaInformes /> : <NuevoInforme />
      ) : ruta.tipo === "informe" ? (
        esObservador ? <VistaPdfInforme id={ruta.id} /> : <EditorInforme id={ruta.id} />
      ) : ruta.tipo === "pdf" ? (
        <VistaPdfInforme id={ruta.id} />
      ) : ruta.tipo === "estadisticas" ? (
        <Estadisticas />
      ) : (
        <div
          className="pb-xl"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 3rem)",
          }}
        >
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center gap-2 px-3 sm:px-margin bg-primary text-on-primary border-b border-primary-container shadow-sm"
        style={{
          minHeight: "calc(env(safe-area-inset-top, 0px) + 3rem)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <LogoTipo className="w-7 h-7 rounded-lg" />
          <h1 className="truncate text-[13px] sm:text-title-md font-title-md font-bold tracking-tight">
            VERDU Y CIA
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {esMaster ? (
            <a
              key={enLinea ? "en-linea" : "sin-conexion"}
              data-tutorial="estadisticas"
              href={enLinea ? "#/estadisticas" : undefined}
              aria-disabled={!enLinea}
              title={enLinea ? undefined : "Requiere conexión a internet"}
              onClick={(e) => { if (!enLinea) e.preventDefault(); }}
              className={`flex h-10 items-center text-[10px] sm:text-label-caps font-label-caps font-bold tracking-wider px-2 sm:px-4 rounded-lg transition-all duration-300 ${
                enLinea
                  ? `bg-white/10 text-on-primary shadow-sm hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${estuvoSinConexion ? "boton-reactivado" : ""}`
                  : "boton-apagado cursor-not-allowed bg-white/5 text-on-primary/40 shadow-none"
              }`}
            >
              ESTADÍSTICAS
            </a>
          ) : null}
          {!esObservador ? <a
            data-tutorial="nuevo"
            href="#/informe/nuevo"
              className="action-light-button flex h-10 items-center gap-1.5 text-[10px] sm:text-label-caps font-label-caps font-bold tracking-wider bg-gradient-to-br from-white to-sky-100 text-primary px-2 sm:px-4 rounded-lg shadow-lg shadow-black/30 ring-1 ring-white/50 hover:brightness-105 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95 transition-all duration-300"
          >
            <Icono nombre="add" className="w-[17px] h-[17px]" />
            NUEVO
          </a> : null}
          <MenuPerfil sesion={sesion} />
        </div>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
         <ListaInformes />
      </main>
        </div>
      )}
      </div>
    </>
  );
}
