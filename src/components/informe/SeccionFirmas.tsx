import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import SignaturePad from "signature_pad";
import { db } from "@/lib/db";
import type { InformeGeneral, TipoArchivo } from "@/lib/types";
import { Seccion } from "@/components/ui";

function ModalFirma({
  titulo,
  onConfirmar,
  onCerrar,
}: {
  titulo: string;
  onConfirmar: (blob: Blob) => void;
  onCerrar: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [puedeConfirmar, setPuedeConfirmar] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    const pad = new SignaturePad(canvas);
    pad.addEventListener("endStroke", () => setPuedeConfirmar(!pad.isEmpty()));
    padRef.current = pad;
    return () => pad.off();
  }, []);

  function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || !padRef.current || padRef.current.isEmpty()) return;
    canvas.toBlob((blob) => {
      if (blob) onConfirmar(blob);
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-margin">
      <div className="bg-white rounded-lg w-full max-w-lg p-md space-y-md">
        <h3 className="text-title-md font-title-md font-bold text-primary uppercase tracking-wider">
          {titulo}
        </h3>
        <canvas
          ref={canvasRef}
          className="w-full h-64 bg-white rounded border border-outline-variant"
          style={{ touchAction: "none" }}
        />
        <div className="flex items-center justify-between gap-sm">
          <button
            type="button"
            className="text-[12px] text-on-surface-variant underline"
            onClick={() => {
              padRef.current?.clear();
              setPuedeConfirmar(false);
            }}
          >
            Limpiar
          </button>
          <div className="flex gap-sm">
            <button
              type="button"
              className="border border-outline-variant rounded px-md py-1 text-[13px]"
              onClick={onCerrar}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!puedeConfirmar}
              className="bg-primary text-on-primary rounded px-md py-1 text-[13px] font-bold uppercase tracking-wider hover:bg-primary-container transition-colors disabled:opacity-40"
              onClick={confirmar}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BloqueFirma({
  titulo,
  tipo,
  informeId,
  onConfirmar,
  children,
}: {
  titulo: string;
  tipo: TipoArchivo;
  informeId: string;
  onConfirmar?: () => void;
  children?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const existente = useLiveQuery(async () => {
    const filas = await db.archivos.where({ informe_id: informeId, tipo }).toArray();
    return filas[0];
  }, [informeId, tipo]);
  const url = useMemo(
    () => (existente ? URL.createObjectURL(existente.blob) : null),
    [existente]
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

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
    setAbierto(false);
    onConfirmar?.();
  }

  async function limpiar() {
    if (existente) await db.archivos.delete(existente.id);
  }

  return (
    <div className="border border-outline-variant rounded-lg p-sm bg-surface-container-low/50">
      <span className="block text-label-caps font-label-caps text-on-surface-variant mb-1">
        {titulo}
      </span>
      {url ? (
        <div className="flex items-center gap-sm">
          <img
            src={url}
            alt={titulo}
            className="h-20 flex-1 object-contain bg-white rounded border border-outline-variant"
          />
          <button type="button" className="text-[11px] text-on-surface-variant underline" onClick={limpiar}>
            Rehacer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full h-20 bg-white rounded border border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant opacity-70"
        >
          Tocar para firmar
        </button>
      )}
      {children}
      {abierto ? (
        <ModalFirma titulo={titulo} onCerrar={() => setAbierto(false)} onConfirmar={guardar} />
      ) : null}
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
        <BloqueFirma titulo="Firma del Técnico" tipo="firma_tecnico" informeId={informe.id} />
        <BloqueFirma
          titulo="Firma del Cliente"
          tipo="firma_cliente"
          informeId={informe.id}
          onConfirmar={() =>
            onChange({ estado_firma: "firmado", firmado_en: new Date().toISOString() })
          }
        >
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
