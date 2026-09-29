"use client";

import { useCallback, useEffect, useState } from "react";
import { usePerfil } from "@/lib/usePerfil";
import { supabase } from "@/lib/supabase";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import { IconoLinea } from "@/components/IconoLinea";
import { PantallaCarga } from "@/components/PantallaCarga";
import type { Cliente } from "@/lib/types";

type ClienteForm = {
  nombre: string;
  telefono: string;
};

const VACIO: ClienteForm = { nombre: "", telefono: "" };

function useEsPc() {
  const [esPc, setEsPc] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const act = () => setEsPc(mq.matches);
    act();
    mq.addEventListener("change", act);
    return () => mq.removeEventListener("change", act);
  }, []);
  return esPc;
}

export function GestionClientes() {
  const { cargando, esMaster } = usePerfil();
  const esPc = useEsPc();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [modo, setModo] = useState<"crear" | "editar" | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setCargandoLista(true);
    setError(null);
    try {
      const { data, error } = await supabase()
        .from("clientes")
        .select("id, nombre, telefono, creado_en, actualizado_en")
        .order("nombre", { ascending: true });
      if (error) throw error;
      setClientes((data ?? []) as Cliente[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar clientes.");
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    if (!cargando && esPc) {
      const t = window.setTimeout(() => void cargar(), 0);
      return () => window.clearTimeout(t);
    }
  }, [cargando, esPc, cargar]);

  if (cargando) return <PantallaCarga mensaje="Cargando clientes..." />;

  if (!esPc) {
    return (
      <div className="px-margin py-xl text-center">
        <p className="text-body-lg text-on-surface-variant">
          Este apartado solo está disponible desde una computadora.
        </p>
        <a href="#/" className="mt-md inline-block bg-primary text-on-primary rounded-lg px-md py-1.5">
          Volver al listado
        </a>
      </div>
    );
  }

  if (!esMaster) {
    return (
      <div className="px-margin py-xl text-center">
        <p className="text-body-lg text-on-surface-variant">
          No tenés permisos de administrador para editar clientes.
        </p>
        <a href="#/" className="mt-md inline-block bg-primary text-on-primary rounded-lg px-md py-1.5">
          Volver al listado
        </a>
      </div>
    );
  }

  function abrirCrear() {
    setForm(VACIO);
    setEditandoId(null);
    setModo("crear");
    setError(null);
    setOk(null);
  }

  function abrirEditar(c: Cliente) {
    setForm({ nombre: c.nombre, telefono: c.telefono ?? "" });
    setEditandoId(c.id);
    setModo("editar");
    setError(null);
    setOk(null);
  }

  function cancelar() {
    setModo(null);
    setEditandoId(null);
    setForm(VACIO);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!form.nombre.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
      };
      if (modo === "editar" && editandoId) {
        const { error } = await supabase().from("clientes").update(payload).eq("id", editandoId);
        if (error) throw error;
        setOk("Cliente actualizado.");
      } else {
        const { error } = await supabase().from("clientes").insert(payload);
        if (error) throw error;
        setOk("Cliente creado.");
      }
      cancelar();
      void cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(c: Cliente) {
    const confirma = window.confirm(
      `¿Eliminar el cliente "${c.nombre}"? Los informes existentes conservarán sus datos.`
    );
    if (!confirma) return;
    setError(null);
    setOk(null);
    try {
      const { error } = await supabase().from("clientes").delete().eq("id", c.id);
      if (error) throw error;
      setOk("Cliente eliminado.");
      void cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el cliente.");
    }
  }

  const texto = busqueda.trim().toLowerCase();
  const filtrados = texto
    ? clientes.filter((c) => `${c.nombre} ${c.telefono ?? ""}`.toLowerCase().includes(texto))
    : clientes;

  return (
    <div
      className="pb-xl px-margin max-w-4xl mx-auto md:px-margin"
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
          <a href="#/" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition-all" aria-label="Volver">
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">Clientes</h1>
        </div>
      </header>

      <div className="list-item-in mt-md mb-md flex flex-wrap items-center justify-between gap-md rounded-2xl bg-gradient-to-br from-[#0f6b57] to-[#16806a] p-md text-white shadow-lg shadow-emerald-900/20">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><IconoLinea nombre="edificio" className="h-6 w-6" /></span>
          <div>
            <p className="text-[16px] font-bold leading-tight">Cartera de clientes</p>
            <p className="text-[12px] text-white/75">Los clientes cargados aparecen al crear un informe.</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-2 text-center ring-1 ring-white/20" style={{ backgroundColor: "rgb(255 255 255 / 12%)" }}>
          <p className="text-[24px] font-extrabold leading-none tabular-nums">{cargandoLista && clientes.length === 0 ? "–" : clientes.length}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/75">Clientes</p>
        </div>
      </div>

      {error ? (
        <div className="aviso-panel mb-md flex items-start gap-2 rounded-xl border border-error/40 bg-error-container/60 px-3 py-2 text-[13px] text-error" role="alert">
          <IconoLinea nombre="alerta" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {ok ? (
        <div className="aviso-panel mb-md flex items-start gap-2 rounded-xl border border-green-600/30 bg-green-50 px-3 py-2 text-[13px] text-green-800" role="status">
          <IconoLinea nombre="check" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ok}</span>
        </div>
      ) : null}

      <section className="section-card mb-lg rounded-2xl border border-outline-variant bg-white p-md shadow-sm">
        <div className="mb-sm flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <IconoLinea nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              className="input-technical h-[40px] w-full pl-9"
              placeholder="Buscar por nombre o teléfono"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar cliente"
            />
          </label>
          <button
            type="button"
            onClick={() => void cargar()}
            disabled={cargandoLista}
            className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-[12px] font-bold text-primary transition-all hover:bg-surface-container-low active:scale-95 disabled:opacity-50"
          >
            {cargandoLista ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" /> : null}
            Actualizar
          </button>
          {modo === null ? (
            <button
              type="button"
              onClick={abrirCrear}
              className="inline-flex h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-b from-primary to-primary-container px-4 text-[12px] font-bold uppercase tracking-wider text-on-primary shadow-md shadow-primary/25 transition-all hover:brightness-110 active:scale-95"
            >
              <Icono nombre="add" className="w-[15px] h-[15px]" />
              Nuevo cliente
            </button>
          ) : null}
        </div>

        {modo !== null ? (
          <form onSubmit={guardar} className="form-cliente mb-md space-y-sm rounded-xl border border-primary/25 bg-primary-fixed/40 p-md">
            <p className="text-[12px] font-bold uppercase tracking-wider text-primary">
              {modo === "editar" ? "Editar cliente" : "Nuevo cliente"}
            </p>
            <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Nombre / Empresa</span>
                <input
                  className="input-technical w-full h-[40px]"
                  type="text"
                  required
                  placeholder="Ej: Transportes del Sur S.A."
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Teléfono</span>
                <input
                  className="input-technical w-full h-[40px]"
                  type="tel"
                  placeholder="Opcional"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-md py-2 text-[13px] font-bold uppercase tracking-wider text-on-primary transition-all hover:bg-primary-container active:scale-[0.98] disabled:opacity-50"
              >
                {guardando ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary border-t-transparent" aria-hidden="true" /> : <IconoLinea nombre="check" className="h-4 w-4" grosor={2.4} />}
                {guardando ? "Guardando..." : modo === "editar" ? "Guardar cambios" : "Crear cliente"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                className="rounded-lg border border-outline-variant bg-white px-md py-2 text-[13px] font-bold text-on-surface-variant transition-all hover:bg-surface-container-low active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {cargandoLista && clientes.length === 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2" aria-label="Cargando clientes">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-outline-variant p-3">
                <span className="esqueleto h-10 w-10 rounded-xl" />
                <span className="flex-1 space-y-1.5"><span className="esqueleto block h-3.5 w-2/3 rounded" /><span className="esqueleto block h-3 w-1/3 rounded" /></span>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="rounded-xl bg-surface-container-low px-3 py-8 text-center text-body-md text-on-surface-variant">
            {clientes.length === 0 ? "No hay clientes cargados." : "No hay clientes que coincidan con la búsqueda."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {filtrados.map((c, index) => (
              <li
                key={c.id}
                className={`list-item-in group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-md ${editandoId === c.id ? "border-primary ring-2 ring-primary/15" : "border-outline-variant"}`}
                style={{ "--item-delay": `${Math.min(index, 10) * 35}ms` } as React.CSSProperties}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-[15px] font-extrabold text-white shadow-sm">
                  {(c.nombre.trim()[0] ?? "?").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-bold text-on-surface" title={c.nombre}>{c.nombre}</p>
                  {c.telefono ? (
                    <p className="flex items-center gap-1 truncate text-[12px] text-on-surface-variant">
                      <IconoLinea nombre="telefono" className="h-3.5 w-3.5 shrink-0" />
                      {c.telefono}
                    </p>
                  ) : (
                    <p className="text-[12px] italic text-on-surface-variant/70">Sin teléfono</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="Editar"
                    aria-label={`Editar ${c.nombre}`}
                    onClick={() => abrirEditar(c)}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-primary-fixed active:scale-90"
                  >
                    <Icono nombre="edit" className="w-[18px] h-[18px] text-primary" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    aria-label={`Eliminar ${c.nombre}`}
                    onClick={() => void eliminar(c)}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-error-container/60 active:scale-90"
                  >
                    <Icono nombre="delete" className="w-[18px] h-[18px] text-error" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
