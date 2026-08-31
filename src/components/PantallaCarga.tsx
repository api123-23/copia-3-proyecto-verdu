import { LogoTipo } from "@/components/LogoTipo";

export function PantallaCarga({ mensaje = "Cargando..." }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-lg px-margin py-2xl min-h-[50dvh]">
      <div className="animate-pulse">
        <LogoTipo className="w-24 h-24 rounded-3xl shadow-lg" />
      </div>
      <div className="flex flex-col items-center gap-sm">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          <span className="text-title-md font-title-md font-bold text-primary tracking-wide">
            {mensaje}
          </span>
        </div>
        <span className="text-body-sm text-on-surface-variant">Air Power S.A.</span>
      </div>
    </div>
  );
}