import { LogoTipo } from "@/components/LogoTipo";

export function PantallaCarga({ mensaje = "Cargando..." }: { mensaje?: string }) {
  return (
    // Aparece con una breve demora: si la carga es rápida no hay parpadeo.
    <div className="pantalla-carga flex min-h-[50dvh] flex-col items-center justify-center gap-lg px-margin py-2xl" role="status" aria-live="polite">
      <div className="pantalla-carga-logo">
        <LogoTipo className="h-24 w-24 rounded-3xl shadow-lg" />
      </div>
      <div className="flex flex-col items-center gap-sm">
        <span className="text-title-md font-title-md font-bold tracking-wide text-primary">{mensaje}</span>
        <span className="pantalla-carga-barra" aria-hidden="true" />
        <span className="text-body-sm text-on-surface-variant">Air Power S.A.</span>
      </div>
    </div>
  );
}
