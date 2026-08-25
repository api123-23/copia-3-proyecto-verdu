import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLiveQuery } from "dexie-react-hooks";
import imageCompression from "browser-image-compression";
import { db } from "@/lib/db";
import type { ArchivoLocal, CategoriaFoto } from "@/lib/types";
import { Label, Seccion } from "@/components/ui";

const CATEGORIAS: { value: CategoriaFoto; label: string }[] = [
  { value: "inicial", label: "Estado Inicial" },
  { value: "desarrollo", label: "Desarrollo" },
  { value: "repuestos", label: "Repuestos" },
  { value: "final", label: "Estado Final" },
  { value: "falla", label: "Falla" },
];

function Lightbox({
  url,
  nombre,
  onCerrar,
}: {
  url: string;
  nombre: string;
  onCerrar: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center p-margin"
      onClick={onCerrar}
    >
      <img
        src={url}
        alt={nombre}
        className="max-h-[75vh] max-w-full object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex gap-sm mt-md" onClick={(e) => e.stopPropagation()}>
        <a
          href={url}
          download={nombre}
          className="bg-primary text-on-primary rounded px-md py-1 text-[13px] font-bold uppercase tracking-wider"
        >
          Descargar
        </a>
        <button
          type="button"
          className="border border-outline-variant rounded px-md py-1 text-[13px] text-white"
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
  const url = useMemo(() => (registro ? URL.createObjectURL(registro.blob) : null), [registro]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );
  const [abierta, setAbierta] = useState(false);
  const categoria = CATEGORIAS.find((c) => c.value === archivo.categoria)?.label ?? "";
  return (
    <div className="relative">
      {url ? (
        <img
          src={url}
          alt={categoria}
          className="h-20 w-20 object-cover rounded border border-outline-variant cursor-pointer"
          onClick={() => setAbierta(true)}
        />
      ) : null}
      <span className="block text-[10px] text-on-surface-variant mt-xs">{categoria}</span>
      {!cerrado ? (
        <button
          type="button"
          className="absolute top-0 right-0 bg-error text-on-error rounded-full w-5 h-5 flex items-center justify-center"
          onClick={() =>
            db.transaction("rw", [db.archivos, db.blobs], async () => {
              await db.archivos.delete(archivo.id);
              await db.blobs.delete(archivo.id);
            })
          }
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
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
}: {
  informeId: string;
  cerrado: boolean;
}) {
  const [categoria, setCategoria] = useState<CategoriaFoto>("inicial");
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fotos = useLiveQuery(
    () => db.archivos.where({ informe_id: informeId, tipo: "foto" }).toArray(),
    [informeId]
  );

  async function onFile(file: File) {
    setSubiendo(true);
    try {
      const blob = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const id = crypto.randomUUID();
      await db.transaction("rw", [db.archivos, db.blobs], async () => {
        await db.blobs.put({ id, blob });
        await db.archivos.put({
          id,
          informe_id: informeId,
          tipo: "foto",
          categoria,
          url: null,
          estado_sync: "pendiente",
          creado_en: new Date().toISOString(),
        });
      });
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Seccion titulo="Registro Fotográfico" badge="Obligatorio">
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
          <button
            type="button"
            className="flex flex-col items-center justify-center w-full p-lg bg-surface-container-low border-2 border-dashed border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer group"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
          >
            <span className="material-symbols-outlined text-[32px] text-primary mb-2">add_a_photo</span>
            <span className="text-title-md font-bold text-primary uppercase tracking-wider">
              {subiendo ? "Procesando..." : "Tomar o Subir Foto"}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {fotos && fotos.length > 0 ? (
            <div className="flex flex-wrap gap-sm justify-center">
              {fotos.map((f) => (
                <FotoItem key={f.id} archivo={f} cerrado={cerrado} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Seccion>
  );
}
