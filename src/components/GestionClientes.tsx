"use client";

import { useCallback, useEffect, useState } from "react";
import { usePerfil } from "@/lib/usePerfil";
import { supabase } from "@/lib/supabase";
import { LogoTipo } from "@/components/LogoTipo";
import { Icono } from "@/components/Icono";
import type { Cliente } from "@/lib/types";

type ClienteForm = {
  nombre: string;
  telefono: string;
  direccion: string;
};

const VACIO: ClienteForm = { nombre: "", telefono: "", direccion: "" };

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
  const { cargando, esAdmin } = usePerfil();
  const esPc = useEsPc();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [modo, setModo] = useState<"crear" | "editar" | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargandoLista(true);
    setError(null);
    try {
      const { data, error } = await supabase()
        .from("clientes")
        .select("id, nombre, telefono, direccion, creado_en, actualizado_en")
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

  if (cargando) return <Cargando />;

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

  if (!esAdmin) {
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
    setForm({ nombre: c.nombre, telefono: c.telefono ?? "", direccion: c.direccion ?? "" });
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
        direccion: form.direccion.trim() || null,
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
          <a href="#/" className="hover:bg-primary-container active:scale-95 transition-all px-2 py-1 rounded" aria-label="Volver">
            <Icono nombre="arrow_back" className="w-[16px] h-[16px]" />
          </a>
          <LogoTipo className="w-7 h-7 rounded-lg hidden sm:inline-flex" />
          <h1 className="text-title-md font-title-md font-bold tracking-tight">Clientes</h1>
        </div>
      </header>

      <div className="bg-white border-b border-outline-variant px-md py-1 flex items-center justify-between mb-md shadow-sm">
        <span className="flex items-center gap-2 text-title-md font-title-md font-bold text-primary">
          <LogoTipo className="w-5 h-5 rounded" />
          AIR POWER S.A.
        </span>
      </div>

      {error ? (
        <div className="mb-md bg-error-container/40 border border-error text-on-error-container rounded-lg px-md py-1.5 text-[13px]">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-md bg-green-100 border border-green-600 text-green-800 rounded-lg px-md py-1.5 text-[13px]">
          {ok}
        </div>
      ) : null}

      <section className="bg-white border border-outline-variant rounded-xl shadow-sm p-md mb-lg">
        <div className="flex items-center justify-between mb-sm">
          <h2 className="text-title-md font-title-md font-bold text-primary uppercase tracking-wider">
            Clientes ({clientes.length})
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void cargar()}
              disabled={cargandoLista}
              className="border border-outline-variant rounded-lg px-md py-1 text-[13px] active:scale-95 transition-all disabled:opacity-50"
            >
              {cargandoLista ? "Cargando..." : "Actualizar"}
            </button>
            {modo === null ? (
              <button
                type="button"
                onClick={abrirCrear}
                className="flex items-center gap-1 bg-primary text-on-primary rounded-lg px-md py-1 text-[13px] font-bold uppercase tracking-wider hover:bg-primary-container active:scale-95 transition-all"
              >
                <Icono nombre="add" className="w-[15px] h-[15px]" />
                Nuevo
              </button>
            ) : null}
          </div>
        </div>

        {modo !== null ? (
          <form onSubmit={guardar} className="bg-surface-container-low/50 border border-outline-variant rounded-lg p-sm mb-md space-y-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
              <input
                className="input-technical w-full h-[36px]"
                type="text"
                required
                placeholder="Nombre / Empresa"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                autoFocus
              />
              <input
                className="input-technical w-full h-[36px]"
                type="tel"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              />
              <input
                className="input-technical w-full h-[36px]"
                type="text"
                placeholder="Ubicación / Dirección"
                value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              />
            </div>
            <div className="flex gap-1">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-primary text-on-primary rounded-lg px-md py-1.5 text-[13px] font-bold uppercase tracking-wider hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {guardando ? "Guardando..." : modo === "editar" ? "Guardar cambios" : "Crear cliente"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                className="border border-outline-variant rounded-lg px-md py-1.5 text-[13px]"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {cargandoLista ? (
          <p className="text-on-surface-variant">Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="text-on-surface-variant">No hay clientes cargados.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {clientes.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-sm">
                <div className="min-w-0">
                  <p className="text-body-md text-on-surface truncate font-bold">{c.nombre}</p>
                  {c.telefono ? (
                    <p className="text-[12px] text-on-surface-variant truncate">Tel: {c.telefono}</p>
                  ) : null}
                  {c.direccion ? (
                    <p className="text-[12px] text-on-surface-variant truncate">Ubicación: {c.direccion}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-low active:scale-95 transition-all"
                  >
                    <Icono nombre="edit" className="w-[18px] h-[18px] text-primary" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    onClick={() => void eliminar(c)}
                    className="p-1.5 rounded-lg hover:bg-error-container/40 active:scale-95 transition-all"
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

function Cargando() {
  return (
    <div className="flex flex-col items-center justify-center gap-lg px-margin py-2xl min-h-[50dvh]">
      <div className="animate-pulse">
        <LogoTipo className="w-24 h-24 rounded-3xl shadow-lg" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        <span className="text-title-md text-primary font-bold">Cargando...</span>
      </div>
    </div>
  );
}
