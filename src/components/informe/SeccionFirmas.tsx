import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import SignaturePad from "signature_pad";
import { db } from "@/lib/db";
import type { InformeGeneral, TipoArchivo } from "@/lib/types";
import { Seccion } from "@/components/ui";

function CanvasFirma({ onFirma }: { onFirma: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    const pad = new SignaturePad(canvas);
    pad.addEventListener("endStroke", () => {
      if (pad.isEmpty()) return;
      canvas.toBlob((blob) => {
        if (blob) onFirma(blob);
      }, "image/png");
    });
    padRef.current = pad;
    return () => pad.off();
  }, [onFirma]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-28 bg-white rounded border border-dashed border-outline-variant"
        style={{ touchAction: "none" }}
      />
      <div className="flex justify-end mt-xs">
        <button
          type="button"
          className="text-[11px] text-on-surface-variant underline"
          onClick={() => padRef.current?.clear()}
        >
          Limpiar
        </button>
      </div>
    </>
  );
}

function BloqueFirma({
  titulo,
  tipo,
  informeId,
  onFirmado,
  children,
}: {
  titulo: string;
  tipo: TipoArchivo;
  informeId: string;
  onFirmado?: () => void;
  children?: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const existente = useLiveQuery(async () => {
    const filas = await db.archivos.where({ informe_id: informeId, tipo }).toArray();
    return filas[0];
  }, [informeId, tipo]);
  const url = useMemo(
    () => (existente ? URL.createObjectURL(existente.blob) : null),
    [existente]
  );
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  async function guardar(blob: Blob) {
    if (existente) await db.archivos.delete(existente.id);
    await db.archivos.put({
      id: crypto.randomUUID(),
      informe_id: informeId,
      tipo,
      categoria: null,
      blob,
      url: null,
      estado_sync: "pendiente",
      creado_en: new Date().toISOString(),
    });
    setEditando(false);
    onFirmado?.();
  }

  async function limpiar() {
    if (existente) await db.archivos.delete(existente.id);
    setEditando(true);
  }

  return (
    <div className="border border-outline-variant rounded-lg p-sm bg-surface-container-low/50">
      <span className="block text-label-caps font-label-caps text-on-surface-variant mb-1">{titulo}</span>
      {url && !editando ? (
        <div className="flex items-center gap-sm">
          <img src={url} alt={titulo} className="h-20 flex-1 object-contain bg-white rounded border border-outline-variant" />
          <button type="button" className="text-[11px] text-on-surface-variant underline" onClick={limpiar}>
            Rehacer
          </button>
        </div>
      ) : (
        <CanvasFirma onFirma={guardar} />
      )}
      {children}
    </div>
  );
}

export default function SeccionFirmas({
  informe,
  onChange,
}: {
  informe: InformeGeneral;
  onChange: (p: Partial<InformeGeneral>) => void;
}) {
  return (
    <Seccion titulo="Firmas Digitales">
      <div className="space-y-sm">
        <BloqueFirma
          titulo="Firma del Técnico"
          tipo="firma_tecnico"
          informeId={informe.id}
          onFirmado={() => onChange({ estado_firma: "firmado", firmado_en: new Date().toISOString() })}
        />
        <BloqueFirma titulo="Firma del Cliente" tipo="firma_cliente" informeId={informe.id}>
          <input
            className="input-technical mt-1.5 text-[12px] h-[28px]"
            placeholder="Aclaración de firma"
            type="text"
            value={informe.aclaracion_firma ?? ""}
            onChange={(e) => onChange({ aclaracion_firma: e.target.value || null })}
          />
        </BloqueFirma>
        <p className="text-[10px] text-on-surface-variant text-center mt-2 italic leading-tight">
          Doy conformidad y certifico que el trabajo ha sido efectuado de acuerdo a lo detallado.
        </p>
      </div>
    </Seccion>
  );
}
