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
        className={`select-small ${valor === "no" ? "text-error" : ""}`}
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

export const OPCIONES_NIVEL = [
  { value: "optimo", label: "Óptimo" },
  { value: "bajo", label: "Bajo" },
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

export function CampoTexto({
  etiqueta,
  valor,
  onChange,
  placeholder,
}: {
  etiqueta: string;
  valor: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{etiqueta}</Label>
      <input
        className="input-technical"
        type="text"
        placeholder={placeholder}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
    </div>
  );
}

export function Divisor() {
  return <div className="divider" />;
}
