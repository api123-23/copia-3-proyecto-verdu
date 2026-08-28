export type NombreIcono =
  | "add"
  | "arrow_back"
  | "send"
  | "calendar_today"
  | "location_on"
  | "close"
  | "add_a_photo";

const TRAZOS: Record<NombreIcono, string> = {
  add: "M450-450H200v-60h250v-250h60v250h250v60H510v250h-60v-250Z",
  arrow_back:
    "m274-450 248 248-42 42-320-320 320-320 42 42-248 248h526v60H274Z",
  send: "M120-160v-640l760 320-760 320Zm60-93 544-227-544-230v168l242 62-242 60v167Zm0 0v-457 457Z",
  calendar_today:
    "M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-60h65v60h340v-60h65v60h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm0-490h600v-130H180v130Zm0 0v-130 130Z",
  location_on:
    "M529.5-510.5Q550-531 550-560t-20.5-49.5Q509-630 480-630t-49.5 20.5Q410-589 410-560t20.5 49.5Q451-490 480-490t49.5-20.5ZM480-159q133-121 196.5-219.5T740-552q0-118-75.5-193T480-820q-109 0-184.5 75T220-552q0 75 65 173.5T480-159Zm0 79Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z",
  close:
    "m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z",
  add_a_photo:
    "M440-437ZM100-120q-24 0-42-18t-18-42v-513q0-23 18-41.5t42-18.5h147l73-87h274v60H348l-73 87H100v513h680v-414h60v414q0 24-18.5 42T780-120H100Zm680-574v-86h-86v-60h86v-87h60v87h87v60h-87v86h-60ZM439.5-267q72.5 0 121.5-49t49-121.5q0-72.5-49-121T439.5-607q-72.5 0-121 48.5t-48.5 121q0 72.5 48.5 121.5t121 49Zm0-60q-47.5 0-78.5-31.5t-31-79q0-47.5 31-78.5t78.5-31q47.5 0 79 31t31.5 78.5q0 47.5-31.5 79t-79 31.5Z",
};

export function Icono({
  nombre,
  className = "w-[1em] h-[1em]",
}: {
  nombre: NombreIcono;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}