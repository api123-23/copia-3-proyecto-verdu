alter table public.informes_generales
  add column if not exists maquina_operativa boolean;

alter table public.informes_generales
  add column if not exists cerrado boolean not null default false;
