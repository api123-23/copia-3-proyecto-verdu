import { useEffect, useMemo, useRef, useState } from "react";
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

function FotoItem({ archivo }: { archivo: ArchivoLocal }) {
  const url = useMemo(() => URL.createObjectURL(archivo.blob), [archivo.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const categoria = CATEGORIAS.find((c) => c.value === archivo.categoria)?.label ?? "";
  return (
    <div className="relative">
      {url ? <img src={url} alt={categoria} className="h-20 w-20 object-cover rounded border border-outline-variant" /> : null}
      <span className="block text-[10px] text-on-surface-variant mt-xs">{categoria}</span>
      <button
        type="button"
        className="absolute top-0 right-0 bg-error text-on-error rounded-full w-5 h-5 flex items-center justify-center"
        onClick={() => db.archivos.delete(archivo.id)}
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
}

export default function SeccionFotos({ informeId }: { informeId: string }) {
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
      await db.archivos.put({
        id: crypto.randomUUID(),
        informe_id: informeId,
        tipo: "foto",
        categoria,
        blob,
        url: null,
        estado_sync: "pendiente",
        creado_en: new Date().toISOString(),
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
                <FotoItem key={f.id} archivo={f} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Seccion>
  );
}
