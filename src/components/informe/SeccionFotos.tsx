"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { comprimirImagenWebp } from "@/lib/imagen";
import type { ArchivoLocal, CategoriaFoto } from "@/lib/types";
import { Label, Seccion } from "@/components/ui";
import { Icono } from "@/components/Icono";

const CATEGORIAS: { value: CategoriaFoto; label: string }[] = [
  { value: "inicial", label: "Estado Inicial" },
  { value: "desarrollo", label: "Desarrollo" },
  { value: "repuestos", label: "Repuestos" },
  { value: "falla", label: "Falla" },
  { value: "horometro", label: "Horómetro" },
  { value: "final", label: "Estado Final" },
];

const ORDEN_FOTOS: CategoriaFoto[] = ["inicial", "desarrollo", "repuestos", "falla", "horometro", "final"];

function generarId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback para navegadores/iOS que no exponen crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function Lightbox({
  url,
  nombre,
  onCerrar,
}: {
  url: string;
  nombre: string;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center p-margin modal-backdrop-in"
      onClick={onCerrar}
    >
      <img
        src={url}
        alt={nombre}
        className="max-h-[75vh] max-w-full object-contain rounded modal-panel-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex gap-sm mt-md" onClick={(e) => e.stopPropagation()}>
        <a
          href={url}
          download={nombre}
          className="bg-primary text-on-primary rounded-lg px-md py-1.5 text-title-md font-bold uppercase tracking-wider"
        >
          Descargar
        </a>
        <button
          type="button"
          className="border border-outline-variant rounded-lg px-md py-1.5 text-title-md text-white"
          onClick={onCerrar}
        >
          Cerrar
        </button>
      </div>
    </div>,
    document.body
  );
}

function FotoItem({ archivo, cerrado }: { archivo: ArchivoLocal; cerrado: boolean }) {
  const registro = useLiveQuery(() => db.blobs.get(archivo.id), [archivo.id]);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (registro || remoteUrl || !archivo.url) return;
    let cancelado = false;
    supabase().storage
      .from("informe-archivos")
      .createSignedUrl(archivo.url, 3600)
      .then(({ data, error }) => {
        if (!cancelado && data?.signedUrl) setRemoteUrl(data.signedUrl);
        if (!cancelado && error) console.warn("[fotos] Error signed URL:", error.message);
      })
      .catch((e) => console.warn("[fotos] Error fetching signed URL:", e));
    return () => { cancelado = true; };
  }, [registro, remoteUrl, archivo.url]);

  const url = useMemo(() => {
    if (registro) return URL.createObjectURL(registro.blob);
    return remoteUrl;
  }, [registro, remoteUrl]);

  useEffect(
    () => () => {
      if (registro && url) URL.revokeObjectURL(url);
    },
    [registro, url]
  );
  const [abierta, setAbierta] = useState(false);
  const categoria = CATEGORIAS.find((c) => c.value === archivo.categoria)?.label ?? "";
  return (
    <div className="relative">
      {url ? (
        <img
          src={url}
          alt={categoria}
          className="h-20 w-20 object-cover rounded border border-outline-variant cursor-pointer photo-thumb-in hover:scale-105 hover:shadow-lg transition-all duration-300"
          onClick={() => setAbierta(true)}
        />
      ) : null}
      <span className="block text-[10px] text-on-surface-variant mt-xs">{categoria}</span>
      {!cerrado ? (
        <button
          type="button"
          className="absolute -top-1 -right-1 bg-error text-on-error rounded-full w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all"
          onClick={() => {
            if (window.confirm("¿Eliminar esta foto?")) {
              db.transaction("rw", [db.archivos, db.blobs], async () => {
                await db.archivos.delete(archivo.id);
                await db.blobs.delete(archivo.id);
              });
            }
          }}
          aria-label="Eliminar foto"
        >
          <Icono nombre="close" className="w-[14px] h-[14px]" />
        </button>
      ) : null}
      {abierta && url ? (
        <Lightbox url={url} nombre={`informe-${categoria}`} onCerrar={() => setAbierta(false)} />
      ) : null}
    </div>
  );
}

export default function SeccionFotos({
  informeId,
  cerrado,
  obligatoria = true,
}: {
  informeId: string;
  cerrado: boolean;
  obligatoria?: boolean;
}) {
  const [categoria, setCategoria] = useState<CategoriaFoto>("inicial");
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const subiendo = progreso !== null;
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const fotos = useLiveQuery(
    () => db.archivos.where("informe_id").equals(informeId).filter((a) => a.tipo === "foto").toArray(),
    [informeId]
  );
  const fotosOrdenadas = fotos?.slice().sort((a, b) => {
    const categoriaA = ORDEN_FOTOS.indexOf(a.categoria ?? "inicial");
    const categoriaB = ORDEN_FOTOS.indexOf(b.categoria ?? "inicial");
    return (categoriaA === -1 ? ORDEN_FOTOS.length : categoriaA) - (categoriaB === -1 ? ORDEN_FOTOS.length : categoriaB)
      || a.creado_en.localeCompare(b.creado_en);
  });

  // Procesa las fotos de a una (comprimir varias a la vez satura la memoria
  // del celular). Todas quedan con la categoría elegida y en el orden elegido.
  async function onFiles(lista: FileList | null, input: HTMLInputElement | null) {
    const archivos = Array.from(lista ?? []).filter((f) => f.type.startsWith("image/") || f.type === "" || /\.(heic|heif)$/i.test(f.name));
    if (input) input.value = "";
    if (archivos.length === 0) return;
    const categoriaElegida = categoria;
    const base = Date.now();
    let fallidas = 0;
    setAviso(null);
    setProgreso({ hecho: 0, total: archivos.length });
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      try {
        let blob: Blob;
        try {
          blob = await comprimirImagenWebp(file);
        } catch (e) {
          // Si la compresión falla (p. ej. HEIC no decodificable), se usa el
          // archivo original para no perder la foto.
          console.warn("[fotos] Falló la compresión, se usa el original:", e);
          blob = file;
        }
        const id = generarId();
        await db.transaction("rw", [db.archivos, db.blobs], async () => {
          await db.blobs.put({ id, blob });
          await db.archivos.put({
            id,
            informe_id: informeId,
            tipo: "foto",
            categoria: categoriaElegida,
            url: null,
            estado_sync: "pendiente",
            creado_en: new Date(base + i).toISOString(),
          });
        });
      } catch (e) {
        fallidas++;
        console.error("[fotos] Error al guardar la foto:", e);
      }
      setProgreso({ hecho: i + 1, total: archivos.length });
    }
    setProgreso(null);
    if (fallidas > 0) {
      setAviso(fallidas === archivos.length
        ? "No se pudo guardar la foto. Intentá nuevamente."
        : `No se pudieron guardar ${fallidas} de ${archivos.length} fotos. Intentá agregarlas nuevamente.`);
    }
  }

  const textoProcesando = progreso
    ? progreso.total > 1 ? `Procesando ${Math.min(progreso.hecho + 1, progreso.total)}/${progreso.total}...` : "Procesando..."
    : null;
  const etiquetaCategoria = CATEGORIAS.find((c) => c.value === categoria)?.label ?? "";

  return (
    <Seccion titulo="Registro Fotográfico" badge={obligatoria ? "Obligatorio" : "Opcional"}>
      <div className="flex flex-col items-center gap-md">
        <div className="w-full max-w-xs space-y-md">
          <div className="space-y-sm">
            <Label>Seleccionar Categoría</Label>
            <select
              className="input-technical w-full h-[28px] py-0"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaFoto)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <button
              type="button"
              className="flex min-h-[120px] flex-col items-center justify-center p-lg bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl hover:bg-surface-container-high hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer group"
               onClick={() => camaraRef.current?.click()}
              disabled={subiendo}
            >
              <Icono nombre="add_a_photo" className="w-[28px] h-[28px] text-primary mb-2" />
              <span className="text-title-md font-bold text-primary uppercase tracking-wider text-center leading-tight">
                {textoProcesando ?? "Tomar Foto"}
              </span>
            </button>
            <button
              type="button"
              className="flex min-h-[120px] flex-col items-center justify-center p-lg bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl hover:bg-surface-container-high hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer group"
               onClick={() => galeriaRef.current?.click()}
              disabled={subiendo}
            >
              <Icono nombre="add_a_photo" className="w-[28px] h-[28px] text-primary mb-2" />
              <span className="text-title-md font-bold text-primary uppercase tracking-wider text-center leading-tight">
                {textoProcesando ?? "De la Galería"}
              </span>
              {!subiendo ? <span className="mt-1 text-[10px] text-on-surface-variant normal-case">Podés elegir varias</span> : null}
            </button>
          </div>
          <input
            ref={camaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void onFiles(e.target.files, e.target)}
          />
          <input
            ref={galeriaRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void onFiles(e.target.files, e.target)}
          />
          {subiendo ? (
            <div className="space-y-1" aria-live="polite">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progreso ? (progreso.hecho / progreso.total) * 100 : 0}%` }} />
              </div>
              <p className="text-center text-[11px] text-on-surface-variant">Guardando en “{etiquetaCategoria}”</p>
            </div>
          ) : null}
          {aviso ? <p className="rounded border border-error bg-error-container px-2 py-1 text-center text-[12px] text-error" role="alert">{aviso}</p> : null}
          {fotosOrdenadas && fotosOrdenadas.length > 0 ? (
            <div className="flex flex-wrap gap-sm justify-center">
              {fotosOrdenadas.map((f) => (
                <FotoItem key={f.id} archivo={f} cerrado={cerrado} />
              ))}
            </div>
          ) : null}
          <p className="text-[12px] text-on-surface-variant text-center">
             {obligatoria ? `Mínimo 3 fotos (${fotos ? fotos.length : 0}/3)` : `Fotos opcionales (${fotos ? fotos.length : 0})`}
          </p>
        </div>
      </div>
    </Seccion>
  );
}
