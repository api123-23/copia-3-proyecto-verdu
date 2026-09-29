// Íconos de línea (SVG inline, sin fuentes externas: funcionan sin conexión).

export type NombreIconoLinea =
  | "datos"
  | "llave"
  | "usuarios"
  | "escudo"
  | "salir"
  | "luna"
  | "chevron"
  | "sin-red"
  | "red"
  | "buscar"
  | "telefono"
  | "check"
  | "edificio"
  | "alerta";

const DIBUJOS: Record<NombreIconoLinea, React.ReactNode> = {
  datos: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.5 1.7-2.3 3-2.3s2.4.8 3 2.3M14.5 10h4M14.5 14h3" />
    </>
  ),
  llave: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.9 12.1L20 3M17 6l3 3M14.5 8.5l2 2" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6M16 5a3.2 3.2 0 010 6.2M18.2 14.8c1.7.7 2.8 2.5 2.8 5.2" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 3l7 3v5.2c0 4.4-2.9 8-7 9.8-4.1-1.8-7-5.4-7-9.8V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  salir: <path d="M15 17l5-5-5-5M20 12H9M12 21H6a2 2 0 01-2-2V5a2 2 0 012-2h6" />,
  luna: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  "sin-red": (
    <path d="M3 3l18 18M8.6 8.6A5.5 5.5 0 0117.9 10a4 4 0 012.3 6.9M17 19H7a4.5 4.5 0 01-1.6-8.7" />
  ),
  red: (
    <path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.8 16a5 5 0 016.4 0M12 19.5h.01" />
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  telefono: (
    <path d="M5 4h3.5l1.8 4.6-2.3 1.4a11 11 0 005.9 5.9l1.4-2.3L20 15.4V19a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  edificio: (
    <>
      <rect x="4.5" y="3" width="15" height="18" rx="1.5" />
      <path d="M8.5 7h2M13.5 7h2M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2M10.5 21v-3h3v3" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.2h.01" />
    </>
  ),
};

export function IconoLinea({
  nombre,
  className = "h-5 w-5",
  grosor = 1.9,
}: {
  nombre: NombreIconoLinea;
  className?: string;
  grosor?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {DIBUJOS[nombre]}
    </svg>
  );
}
