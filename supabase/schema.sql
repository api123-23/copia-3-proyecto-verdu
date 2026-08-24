create table if not exists perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'tecnico' check (rol in ('tecnico', 'admin')),
  creado_en timestamptz not null default now()
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  direccion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists informes_generales (
  id uuid primary key,
  numero_registro int unique,
  cliente_id uuid references clientes (id) on delete set null,
  cliente_nombre text not null,
  cliente_telefono text,
  cliente_direccion text,
  tecnico_id uuid not null default auth.uid() references auth.users (id),
  fecha_hora timestamptz not null,
  tipo_equipo text not null check (tipo_equipo in (
    'motocompresor', 'compresor', 'grupo_electrogeno', 'extraordinarios', 'vehiculos'
  )),
  observaciones text,
  observaciones_ia text,
  maquina_operativa boolean,
  horas_trabajadas numeric(5, 2),
  repuestos_air_power text,
  repuestos_cliente text,
  requiere_cotizacion boolean not null default false,
  cotizacion_notas text,
  cotizacion_notas_ia text,
  estado_firma text not null default 'pendiente' check (estado_firma in ('pendiente', 'firmado')),
  firma_tecnico_url text,
  firma_cliente_url text,
  aclaracion_firma text,
  firmado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  sincronizado_en timestamptz
);

create table if not exists informes_motocompresor (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro numeric(10, 2),
  aceite_motor text check (aceite_motor in ('si', 'no', 'optimo', 'bajo')),
  aceite_unidad text check (aceite_unidad in ('si', 'no')),
  refrig_radiador text check (refrig_radiador in ('si', 'no', 'optimo', 'bajo')),
  estado_bateria text check (estado_bateria in ('si', 'no', 'optimo', 'bajo')),
  conec_purga text check (conec_purga in ('si', 'no')),
  inst_electrica text check (inst_electrica in ('si', 'no')),
  carroceria text check (carroceria in ('si', 'no')),
  jabalina text check (jabalina in ('si', 'no')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  presion_unidad_comp numeric(10, 2),
  presion_aceite_motor numeric(10, 2),
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no')),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  perdida_combustible text check (perdida_combustible in ('si', 'no'))
);

create table if not exists informes_compresor (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro numeric(10, 2),
  aceite_unidad text check (aceite_unidad in ('si', 'no')),
  inst_electrica text check (inst_electrica in ('si', 'no')),
  jabalina text check (jabalina in ('si', 'no')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  tension_linea_f1 numeric(10, 2),
  tension_linea_f2 numeric(10, 2),
  tension_linea_f3 numeric(10, 2),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  circuito_refr_m text check (circuito_refr_m in ('si', 'no')),
  circuito_despresuriz text check (circuito_despresuriz in ('si', 'no')),
  circuito_arranque text check (circuito_arranque in ('si', 'no')),
  circuito_seguridad text check (circuito_seguridad in ('si', 'no')),
  circuito_electr text check (circuito_electr in ('si', 'no')),
  tiempo_y_delta text,
  diferencial text,
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no'))
);

create table if not exists informes_vehiculos (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro numeric(10, 2),
  aceite_motor text check (aceite_motor in ('si', 'no', 'optimo', 'bajo')),
  refrig_radiador text check (refrig_radiador in ('si', 'no', 'optimo', 'bajo')),
  estado_bateria text check (estado_bateria in ('si', 'no', 'optimo', 'bajo')),
  inst_electrica text check (inst_electrica in ('si', 'no')),
  carroceria text check (carroceria in ('si', 'no')),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no')),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  perdida_combustible text check (perdida_combustible in ('si', 'no'))
);

create table if not exists informe_archivos (
  id uuid primary key,
  informe_id uuid not null references informes_generales (id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'firma_tecnico', 'firma_cliente')),
  categoria text check (categoria in ('inicial', 'desarrollo', 'repuestos', 'final', 'falla')),
  url text not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_informes_tecnico on informes_generales (tecnico_id);
create index if not exists idx_informes_fecha on informes_generales (fecha_hora);
create index if not exists idx_informes_cliente on informes_generales (cliente_id);
create index if not exists idx_archivos_informe on informe_archivos (informe_id);

create sequence if not exists seq_numero_informe start 1;

create or replace function public.asignar_numero_informe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero_registro is null then
    new.numero_registro := nextval('public.seq_numero_informe');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asignar_numero on informes_generales;
create trigger trg_asignar_numero
  before insert on informes_generales
  for each row execute function public.asignar_numero_informe();

create or replace function public.rol_actual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select rol from perfiles where id = auth.uid()),
    'tecnico'
  );
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rol_actual() = 'admin';
$$;

create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, rol)
  values (new.id, 'tecnico')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_nuevo_usuario on auth.users;
create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_clientes on clientes;
create trigger trg_touch_clientes
  before update on clientes
  for each row execute function public.tocar_actualizado_en();

alter table perfiles enable row level security;
alter table clientes enable row level security;
alter table informes_generales enable row level security;
alter table informes_motocompresor enable row level security;
alter table informes_compresor enable row level security;
alter table informes_vehiculos enable row level security;
alter table informe_archivos enable row level security;

create policy perfiles_select on perfiles for select to authenticated
  using (id = auth.uid() or public.es_admin());
create policy perfiles_insert_admin on perfiles for insert to authenticated
  with check (public.es_admin());
create policy perfiles_update_admin on perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy clientes_select on clientes for select to authenticated using (true);
create policy clientes_write_admin on clientes for insert to authenticated
  with check (public.es_admin());
create policy clientes_update_admin on clientes for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy clientes_delete_admin on clientes for delete to authenticated
  using (public.es_admin());

create policy informes_select on informes_generales for select to authenticated
  using (tecnico_id = auth.uid() or public.es_admin());
create policy informes_insert on informes_generales for insert to authenticated
  with check (tecnico_id = auth.uid());
create policy informes_update on informes_generales for update to authenticated
  using (tecnico_id = auth.uid() or public.es_admin())
  with check (tecnico_id = auth.uid() or public.es_admin());
create policy informes_delete_admin on informes_generales for delete to authenticated
  using (public.es_admin());

create policy moto_select on informes_motocompresor for select to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy moto_write on informes_motocompresor for insert to authenticated
  with check (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy moto_update on informes_motocompresor for update to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy moto_delete on informes_motocompresor for delete to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));

create policy comp_select on informes_compresor for select to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy comp_write on informes_compresor for insert to authenticated
  with check (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy comp_update on informes_compresor for update to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy comp_delete on informes_compresor for delete to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));

create policy veh_select on informes_vehiculos for select to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy veh_write on informes_vehiculos for insert to authenticated
  with check (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy veh_update on informes_vehiculos for update to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy veh_delete on informes_vehiculos for delete to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));

create policy archivos_select on informe_archivos for select to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy archivos_insert on informe_archivos for insert to authenticated
  with check (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy archivos_update on informe_archivos for update to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy archivos_delete on informe_archivos for delete to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));

insert into storage.buckets (id, name, public)
values ('informe-archivos', 'informe-archivos', false)
on conflict (id) do nothing;

create policy storage_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'informe-archivos' and owner = auth.uid());
create policy storage_select on storage.objects for select to authenticated
  using (bucket_id = 'informe-archivos' and (owner = auth.uid() or public.es_admin()));
create policy storage_update on storage.objects for update to authenticated
  using (bucket_id = 'informe-archivos' and owner = auth.uid());
