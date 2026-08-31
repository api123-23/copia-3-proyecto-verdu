import type { ReactNode } from "react";

export function Seccion({
  titulo,
  badge,
  children,
}: {
  titulo: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-lg bg-white shadow-sm border border-outline-variant mx-4 md:mx-0 rounded-lg overflow-hidden">
      <div className="section-header">
        <h2 className="section-title">{titulo}</h2>
        {badge ? <span className="required-badge">{badge}</span> : null}
      </div>
      <div className="p-md">{children}</div>
    </section>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block text-label-caps font-label-caps text-on-surface-variant mb-xs">
      {children}
    </label>
  );
}

export function SubTitulo({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-label-caps font-label-caps font-bold text-primary mb-sm uppercase border-b border-outline-variant pb-1">
      {children}
    </h3>
  );
}

export function GrupoTitulo({ children }: { children: ReactNode }) {
  return (
    <h4 className="col-span-2 text-[10px] font-bold text-on-surface-variant mb-xs">{children}</h4>
  );
}

export function ItemSelect({
  etiqueta,
  valor,
  onChange,
  opciones,
}: {
  etiqueta: string;
  valor: string | null;
  onChange: (v: string | null) => void;
  opciones: { value: string; label: string }[];
}) {
  return (
    <div className="flex justify-between items-center bg-surface-container-low p-1 rounded">
      <span className="text-body-md font-body-md text-[12px]">{etiqueta}</span>
      <select
        className={`select-small ${valor === "no" || valor === "mal" ? "text-error" : ""}`}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        <option value="">---</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ItemSelectFull({
  etiqueta,
  valor,
  onChange,
  opciones,
  className,
}: {
  etiqueta: string;
  valor: string | null;
  onChange: (v: string | null) => void;
  opciones: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`flex justify-between items-center bg-surface-container-low p-1.5 rounded ${className ?? ""}`}>
      <span className="text-body-md font-body-md text-[12px]">{etiqueta}</span>
      <select
        className={`select-small ${valor === "no" || valor === "mal" ? "text-error" : ""}`}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        <option value="">---</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const OPCIONES_SI_NO = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

export const OPCIONES_OK_MAL = [
  { value: "ok", label: "Ok" },
  { value: "mal", label: "Mal" },
];

export const OPCIONES_NIVEL = [
  { value: "ok", label: "Ok" },
  { value: "bajo", label: "Bajo" },
  { value: "alto", label: "Alto" },
];

export const OPCIONES_OK_NO = [
  { value: "ok", label: "Ok" },
  { value: "no", label: "No" },
];

export const OPCIONES_OPTIMO_BAJO_ALTO = [
  { value: "optimo", label: "Óptimo" },
  { value: "bajo", label: "Bajo" },
  { value: "alto", label: "Alto" },
];

export const OPCIONES_OK_BAJO = [
  { value: "ok", label: "Ok" },
  { value: "bajo", label: "Bajo" },
];

export const OPCIONES_BAJA_ALTA = [
  { value: "ok", label: "Ok" },
  { value: "baja", label: "Baja" },
  { value: "alta", label: "Alta" },
];

export function CampoNumero({
  etiqueta,
  valor,
  onChange,
  sufijo,
  centrado,
}: {
  etiqueta: string;
  valor: number | null;
  onChange: (v: number | null) => void;
  sufijo?: string;
  centrado?: boolean;
}) {
  return (
    <div>
      <Label>{etiqueta}</Label>
      <div className="relative">
        <input
          className={`input-technical text-data-mono font-data-mono h-[28px] ${centrado ? "text-center px-1" : ""} ${sufijo ? "pr-12" : ""}`}
          type="number"
          value={valor ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        {sufijo ? (
          <span className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-label-caps font-label-caps">
            {sufijo}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function Divisor() {
  return <div className="divider" />;
}

export function BotonPrimario({
  children,
  onClick,
  disabled,
  cargando,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  cargando?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || cargando}
      className={`bg-primary text-on-primary rounded-lg px-md py-1.5 text-title-md font-title-md font-bold uppercase tracking-wider hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
    >
      {cargando ? (
        <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

export function Toast({
  mensaje,
  tipo = "exito",
  onCerrar,
}: {
  mensaje: string;
  tipo?: "exito" | "error" | "info";
  onCerrar: () => void;
}) {
  const colores = {
    exito: "bg-green-600 text-white",
    error: "bg-error text-on-error",
    info: "bg-primary text-on-primary",
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] animate-[slideDown_0.3s_ease-out]">
      <div className={`flex items-center gap-2 px-md py-2 rounded-lg shadow-lg ${colores[tipo]}`}>
        <span className="text-body-md font-body-md">{mensaje}</span>
        <button type="button" onClick={onCerrar} className="text-white/80 hover:text-white text-lg leading-none">
          &times;
        </button>
      </div>
    </div>
  );
}
