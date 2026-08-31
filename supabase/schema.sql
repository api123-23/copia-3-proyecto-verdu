create table if not exists perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'tecnico' check (rol in ('tecnico', 'admin')),
  email text,
  nombre text,
  apellido text,
  creado_en timestamptz not null default now()
);

-- Las columnas nuevas se agregan explícitamente por si la tabla ya existía
-- (create table if not exists no modifica tablas preexistentes).
alter table perfiles add column if not exists email text;
alter table perfiles add column if not exists nombre text;
alter table perfiles add column if not exists apellido text;

-- (opcional) backfill email de perfiles existentes
update perfiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

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
  horas_trabajadas numeric(10, 2),
  repuestos_air_power text,
  repuestos_cliente text,
  requiere_cotizacion boolean not null default false,
  cotizacion_notas text,
  cotizacion_notas_ia text,
  estado_firma text not null default 'pendiente' check (estado_firma in ('pendiente', 'firmado')),
  cerrado boolean not null default false,
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
  aceite_motor text check (aceite_motor in ('ok', 'alto', 'bajo')),
  aceite_unidad text check (aceite_unidad in ('ok', 'alto', 'bajo')),
  refrig_radiador text check (refrig_radiador in ('ok', 'alto', 'bajo')),
  estado_bateria text check (estado_bateria in ('ok', 'mal')),
  conec_purga text check (conec_purga in ('si', 'no')),
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  carroceria text check (carroceria in ('ok', 'mal')),
  jabalina text check (jabalina in ('si', 'no')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  presion_unidad_comp numeric(10, 2),
  presion_aceite_motor text check (presion_aceite_motor in ('ok', 'bajo')),
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no')),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  perdida_combustible text check (perdida_combustible in ('si', 'no'))
);

create table if not exists informes_compresor (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro numeric(10, 2),
  aceite_unidad text check (aceite_unidad in ('ok', 'bajo', 'alto')),
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  jabalina text check (jabalina in ('si', 'no')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  tension_linea numeric(10, 2),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  circuito_refr_m text check (circuito_refr_m in ('ok', 'mal')),
  circuito_despresuriz text check (circuito_despresuriz in ('si', 'no')),
  circuito_arranque text check (circuito_arranque in ('ok', 'mal')),
  circuito_seguridad text check (circuito_seguridad in ('ok', 'mal')),
  circuito_electr text check (circuito_electr in ('ok', 'mal')),
  tiempo_y_delta text check (tiempo_y_delta in ('ok', 'bajo', 'alto')),
  diferencial text,
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no'))
);

create table if not exists informes_vehiculos (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro numeric(10, 2),
  aceite_motor text check (aceite_motor in ('ok', 'alto', 'bajo')),
  refrig_radiador text check (refrig_radiador in ('ok', 'alto', 'bajo')),
  estado_bateria text check (estado_bateria in ('ok', 'mal')),
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  carroceria text check (carroceria in ('ok', 'mal')),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no')),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  perdida_combustible text check (perdida_combustible in ('si', 'no'))
);

create table if not exists informes_grupo_electrogeno (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  ge_motor_detenido_aceite_motor text check (ge_motor_detenido_aceite_motor in ('ok', 'bajo', 'alto')),
  ge_motor_detenido_agua_radiador text check (ge_motor_detenido_agua_radiador in ('ok', 'bajo', 'alto')),
  ge_motor_detenido_restriccion_aire text check (ge_motor_detenido_restriccion_aire in ('si', 'no')),
  ge_motor_detenido_tension_correas text check (ge_motor_detenido_tension_correas in ('ok', 'mal')),
  ge_motor_detenido_estado_baterias text check (ge_motor_detenido_estado_baterias in ('ok', 'mal')),
  ge_motor_detenido_inst_electrica text check (ge_motor_detenido_inst_electrica in ('ok', 'mal')),
  ge_motor_detenido_cableado_distrib text check (ge_motor_detenido_cableado_distrib in ('ok', 'mal')),
  ge_motor_detenido_cubo_ventilador text check (ge_motor_detenido_cubo_ventilador in ('ok', 'mal')),
  ge_motor_detenido_ajuste_motor text check (ge_motor_detenido_ajuste_motor in ('si', 'no')),
  ge_motor_detenido_union_tubo_aire text check (ge_motor_detenido_union_tubo_aire in ('ok', 'mal')),
  ge_motor_detenido_lineas_combustible text check (ge_motor_detenido_lineas_combustible in ('ok', 'mal')),
  ge_funcionamiento_sistema_arranque text check (ge_funcionamiento_sistema_arranque in ('ok', 'mal')),
  ge_funcionamiento_mangueras text check (ge_funcionamiento_mangueras in ('ok', 'mal')),
  ge_funcionamiento_presion_aceite text check (ge_funcionamiento_presion_aceite in ('ok', 'bajo')),
  ge_funcionamiento_temp_agua text check (ge_funcionamiento_temp_agua in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_diferencial_temp text check (ge_funcionamiento_diferencial_temp in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_vibraciones text check (ge_funcionamiento_vibraciones in ('si', 'no')),
  ge_funcionamiento_antivibratorios text check (ge_funcionamiento_antivibratorios in ('ok', 'mal')),
  ge_funcionamiento_llave_termomagnetica text check (ge_funcionamiento_llave_termomagnetica in ('ok', 'mal')),
  ge_funcionamiento_carga_alternador text check (ge_funcionamiento_carga_alternador in ('ok', 'mal')),
  ge_funcionamiento_llave_transferencia text check (ge_funcionamiento_llave_transferencia in ('si', 'no')),
  ge_funcionamiento_rpm_max text check (ge_funcionamiento_rpm_max in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_circ_seguridad text check (ge_funcionamiento_circ_seguridad in ('ok', 'mal')),
  ge_funcionamiento_ventilacion_aire text check (ge_funcionamiento_ventilacion_aire in ('ok', 'mal')),
  ge_funcionamiento_perdidas_aceite text check (ge_funcionamiento_perdidas_aceite in ('si', 'no')),
  ge_funcionamiento_perdidas_combustible text check (ge_funcionamiento_perdidas_combustible in ('si', 'no')),
  ge_funcionamiento_restriccion_escape text check (ge_funcionamiento_restriccion_escape in ('si', 'no')),
  ge_funcionamiento_restriccion_aire text check (ge_funcionamiento_restriccion_aire in ('si', 'no')),
  ge_funcionamiento_frecuencia text check (ge_funcionamiento_frecuencia in ('ok', 'baja', 'alta')),
  ge_funcionamiento_tension_linea text check (ge_funcionamiento_tension_linea in ('ok', 'baja', 'alta')),
  ge_funcionamiento_amperaje_f1 numeric(10, 2),
  ge_funcionamiento_amperaje_f2 numeric(10, 2),
  ge_funcionamiento_amperaje_f3 numeric(10, 2),
  ge_funcionamiento_tension_linea_carga text check (ge_funcionamiento_tension_linea_carga in ('ok', 'baja', 'alta')),
  ge_funcionamiento_temp_ambiente numeric(10, 2),
  ge_funcionamiento_inspeccion_bateria text check (ge_funcionamiento_inspeccion_bateria in ('ok', 'mal')),
  ge_funcionamiento_accion_electrico text check (ge_funcionamiento_accion_electrico in ('si', 'no'))
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

-- INTEGRIDAD: garantiza ON DELETE CASCADE en las tablas dependientes.
-- create table if not exists NO agrega/repara la FK en tablas ya creadas por
-- versiones viejas del esquema (borrar informes_generales dejaba huérfanos).
-- Limpia huérfanos, dropea cualquier FK a informes_generales y la re-crea con cascade.
create or replace function public.garantizar_cascade(tabla text)
returns void
language plpgsql
set search_path = public
as $$
declare c record;
begin
  execute format(
    'delete from %I.%I h where not exists (select 1 from informes_generales g where g.id = h.informe_id)',
    'public', tabla
  );
  for c in (
    select con.conname
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    where ns.nspname = 'public'
      and cl.relname = tabla
      and con.contype = 'f'
      and con.confrelid = 'informes_generales'::regclass
  ) loop
    execute format('alter table %I.%I drop constraint %I', 'public', tabla, c.conname);
  end loop;
  execute format(
    'alter table %I.%I add constraint %I foreign key (informe_id) references informes_generales (id) on delete cascade',
    'public', tabla, tabla || '_informe_id_fk'
  );
end;
$$;

select public.garantizar_cascade('informes_motocompresor');
select public.garantizar_cascade('informes_compresor');
select public.garantizar_cascade('informes_vehiculos');
select public.garantizar_cascade('informes_grupo_electrogeno');
select public.garantizar_cascade('informe_archivos');

-- Al borrar un usuario (admin), sus informes deben conservarse pero desvincularse
-- del técnico. informes_generales.tecnico_id → auth.users(id) se creó sin
-- "on delete" (RESTRICT por defecto), lo que impedía borrar técnicos con informes.
-- Esta función hace la columna nullable y re-crea la FK con on delete set null.
create or replace function public.garantizar_tecnico_set_null()
returns void
language plpgsql
set search_path = public
as $$
declare c record;
begin
  alter table informes_generales alter column tecnico_id drop not null;
  for c in (
    select con.conname
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    where ns.nspname = 'public'
      and cl.relname = 'informes_generales'
      and con.contype = 'f'
      and exists (
        select 1
        from unnest(con.conkey) k
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k
        where a.attname = 'tecnico_id'
      )
  ) loop
    execute format('alter table %I.%I drop constraint %I', 'public', 'informes_generales', c.conname);
  end loop;
  execute format(
    'alter table %I.%I add constraint %I foreign key (tecnico_id) references auth.users (id) on delete set null',
    'public', 'informes_generales', 'informes_generales_tecnico_id_fk'
  );
end;
$$;

select public.garantizar_tecnico_set_null();

alter table informes_generales alter column horas_trabajadas type numeric(10, 2);

-- Ayuda idempotente: elimina TODOS los checks de una columna (incluso si el nombre
-- cambió por renombres o quedó truncado por el límite de 63 caracteres).
create or replace function public.dropar_checks_de_columna(tabla text, columna text)
returns void
language plpgsql
set search_path = public
as $$
declare c record;
begin
  for c in (
    select con.conname
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    where ns.nspname = 'public'
      and cl.relname = tabla
      and con.contype = 'c'
      and exists (
        select 1
        from unnest(con.conkey) k
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k
        where a.attname = columna
      )
  ) loop
    execute format('alter table %I.%I drop constraint %I', 'public', tabla, c.conname);
  end loop;
end $$;

-- VEHÍCULOS: inspección de batería pasa a Ok/Mal (legacy si/no/alto/bajo)
select public.dropar_checks_de_columna('informes_vehiculos', 'estado_bateria');
update informes_vehiculos set estado_bateria = null where estado_bateria in ('alto', 'bajo');
alter table informes_vehiculos add constraint informes_vehiculos_estado_bateria_check
  check (estado_bateria in ('ok', 'mal'));

-- MOTODES: batería también pasa a Ok/Mal
select public.dropar_checks_de_columna('informes_motocompresor', 'estado_bateria');
update informes_motocompresor set estado_bateria = null where estado_bateria in ('alto', 'bajo');
alter table informes_motocompresor add constraint informes_motocompresor_estado_bateria_check
  check (estado_bateria in ('ok', 'mal'));

-- COMPRESOR: tensión de línea unificada en un solo campo
alter table informes_compresor add column if not exists tension_linea numeric(10, 2);
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'informes_compresor'
      and column_name = 'tension_linea_f1'
  ) then
    update informes_compresor
      set tension_linea = tension_linea_f1
      where tension_linea is null and tension_linea_f1 is not null;
  end if;
end $$;
alter table informes_compresor drop column if exists tension_linea_f1;
alter table informes_compresor drop column if exists tension_linea_f2;
alter table informes_compresor drop column if exists tension_linea_f3;

-- MOTORCOMPRESOR: aceite unidad pasa a ok/bajo/alto (legacy si/no)
select public.dropar_checks_de_columna('informes_motocompresor', 'aceite_unidad');
update informes_motocompresor set aceite_unidad = case
  when aceite_unidad = 'si' then 'ok'
  when aceite_unidad = 'no' then 'bajo'
  else aceite_unidad end;
alter table informes_motocompresor add constraint informes_motocompresor_aceite_unidad_check
  check (aceite_unidad in ('ok', 'bajo', 'alto'));

-- COMPRESOR: aceite unidad pasa a ok/bajo/alto (legacy si/no)
select public.dropar_checks_de_columna('informes_compresor', 'aceite_unidad');
update informes_compresor set aceite_unidad = case
  when aceite_unidad = 'si' then 'ok'
  when aceite_unidad = 'no' then 'bajo'
  else aceite_unidad end;
alter table informes_compresor add constraint informes_compresor_aceite_unidad_check
  check (aceite_unidad in ('ok', 'bajo', 'alto'));

-- COMPRESOR: tiempo de conmutación Y-Δ pasa a ok/bajo/alto (legacy si/no/mal)
select public.dropar_checks_de_columna('informes_compresor', 'tiempo_y_delta');
update informes_compresor set tiempo_y_delta = case
  when tiempo_y_delta = 'si' then 'ok'
  when tiempo_y_delta in ('no', 'mal') then 'bajo'
  when tiempo_y_delta in ('ok', 'bajo', 'alto') then tiempo_y_delta
  else null end;
alter table informes_compresor add constraint informes_compresor_tiempo_y_delta_check
  check (tiempo_y_delta in ('ok', 'bajo', 'alto'));

-- GE: elimino campos 12/13/14 de "verificar con motor detenido"
alter table informes_grupo_electrogeno drop column if exists ge_motor_detenido_dca_anticongelante;
alter table informes_grupo_electrogeno drop column if exists ge_motor_detenido_ajuste_inyectores;
alter table informes_grupo_electrogeno drop column if exists ge_motor_detenido_calibre_inyectores;

-- GE: niveles de aceite/agua con opción "alto" (legacy mal → bajo)
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_motor_detenido_aceite_motor');
update informes_grupo_electrogeno set ge_motor_detenido_aceite_motor = 'bajo' where ge_motor_detenido_aceite_motor = 'mal';
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_ge_motor_detenido_aceite_motor_check
  check (ge_motor_detenido_aceite_motor in ('ok', 'bajo', 'alto'));
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_motor_detenido_agua_radiador');
update informes_grupo_electrogeno set ge_motor_detenido_agua_radiador = 'bajo' where ge_motor_detenido_agua_radiador = 'mal';
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_ge_motor_detenido_agua_radiador_check
  check (ge_motor_detenido_agua_radiador in ('ok', 'bajo', 'alto'));

-- GE: carga del alternador pasa a Ok/Mal (legacy si/no)
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_carga_alternador');
update informes_grupo_electrogeno set ge_funcionamiento_carga_alternador = case
  when ge_funcionamiento_carga_alternador = 'si' then 'ok'
  when ge_funcionamiento_carga_alternador = 'no' then 'mal'
  else null end
  where ge_funcionamiento_carga_alternador in ('si', 'no');
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_ge_funcionamiento_carga_alternador_check
  check (ge_funcionamiento_carga_alternador in ('ok', 'mal'));

-- GE: pérdidas de aceite pasa a Sí/No (legacy óptimo/bajo/alto)
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_perdidas_aceite');
update informes_grupo_electrogeno set ge_funcionamiento_perdidas_aceite = case
  when ge_funcionamiento_perdidas_aceite = 'optimo' then 'no'
  when ge_funcionamiento_perdidas_aceite in ('bajo', 'alto') then 'si'
  else null end
  where ge_funcionamiento_perdidas_aceite in ('optimo', 'bajo', 'alto');
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_ge_funcionamiento_perdidas_aceite_check
  check (ge_funcionamiento_perdidas_aceite in ('si', 'no'));

-- GE: amperaje de fases pasa a numérico
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_amperaje_f1');
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_amperaje_f2');
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_amperaje_f3');
update informes_grupo_electrogeno set
  ge_funcionamiento_amperaje_f1 = null,
  ge_funcionamiento_amperaje_f2 = null,
  ge_funcionamiento_amperaje_f3 = null;
alter table informes_grupo_electrogeno alter column ge_funcionamiento_amperaje_f1 type numeric(10, 2) using ge_funcionamiento_amperaje_f1::numeric;
alter table informes_grupo_electrogeno alter column ge_funcionamiento_amperaje_f2 type numeric(10, 2) using ge_funcionamiento_amperaje_f2::numeric;
alter table informes_grupo_electrogeno alter column ge_funcionamiento_amperaje_f3 type numeric(10, 2) using ge_funcionamiento_amperaje_f3::numeric;

-- GE: inspección de batería pasa a Ok/Mal (legacy si/no)
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_inspeccion_bateria');
update informes_grupo_electrogeno set ge_funcionamiento_inspeccion_bateria = case
  when ge_funcionamiento_inspeccion_bateria = 'no' then 'mal'
  when ge_funcionamiento_inspeccion_bateria = 'si' then 'ok'
  else null end
  where ge_funcionamiento_inspeccion_bateria in ('si', 'no');
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_ge_funcionamiento_inspeccion_bateria_check
  check (ge_funcionamiento_inspeccion_bateria in ('ok', 'mal'));

-- NUMERACIÓN: 100% servidor, por orden de llegada.
-- Una secuencia real garantiza números únicos y consecutivos aunque varios
-- dispositivos sincronicen en paralelo (nextval es atómico).
--
-- IMPORTANTE: NO se usa un BEFORE INSERT trigger con nextval(). Un trigger
-- BEFORE INSERT también se dispara en INSERT ... ON CONFLICT DO UPDATE (UPSERT),
-- incluso cuando la fila existe y solo se actualiza, quemando un valor de la
-- secuencia en cada re-sincronización (firmar/editar un informe cargado
-- incrementaría el contador de forma incorrecta). Por eso el número se asigna
-- EXPLÍCITAMENTE desde el cliente (sync.ts) solo cuando el informe es nuevo,
-- vía la función siguiente_numero_informe(), y nunca se toca al editar/firmar.
create sequence if not exists public.numero_informe_seq;

-- NOTA: la RPC debe ser VOLATILE (no STABLE/IMMUTABLE). Si es STABLE, PostgREST
-- la ejecuta en una transacción de SOLO LECTURA y nextval() fallaría con
-- "cannot execute nextval() in a read-only transaction".
create or replace function public.siguiente_numero_informe()
returns bigint
language sql
volatile
set search_path = public
as $$
  select nextval('public.numero_informe_seq');
$$;

grant execute on function public.siguiente_numero_informe() to authenticated;
grant usage on sequence public.numero_informe_seq to authenticated;

-- Asegura que la secuencia continúa a partir del máximo existente, o arranca en
-- 1 si la tabla está vacía (p. ej. recién creada).
-- Si borraste todos los informes y querés reiniciar la numeración en 1, este
-- bloque lo hace automáticamente cuando no quedan filas.
do $$
declare
  maximo bigint;
begin
  select coalesce(max(numero_registro), 0)::bigint into maximo from public.informes_generales;
  if maximo = 0 then
    perform setval('public.numero_informe_seq', 1, false);
  else
    perform setval('public.numero_informe_seq', greatest(maximo, (select last_value from public.numero_informe_seq)), true);
  end if;
end $$;

-- Se retiran el trigger y la función de la numeración automática anterior.
drop trigger if exists trg_asignar_numero on informes_generales;
drop function if exists public.asignar_numero_informe();

-- Se retira el default: la única fuente de numeración es siguiente_numero_informe().
alter table informes_generales
  alter column numero_registro drop default;

-- Se retira el mecanismo anterior (tabla contador + trigger viejo)
drop table if exists public.contador_informes;

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
  insert into public.perfiles (id, rol, email)
  values (new.id, 'tecnico', new.email)
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
alter table informes_grupo_electrogeno enable row level security;
alter table informe_archivos enable row level security;

drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles for select to authenticated
  using (true);
drop policy if exists perfiles_insert_admin on perfiles;
create policy perfiles_insert_admin on perfiles for insert to authenticated
  with check (public.es_admin());
drop policy if exists perfiles_update_admin on perfiles;
create policy perfiles_update_admin on perfiles for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
-- Cualquier usuario puede actualizar sus propios datos (nombre/apellido),
-- pero NO puede cambiarse el rol.
drop policy if exists perfiles_update_own on perfiles;
create policy perfiles_update_own on perfiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and rol is not distinct from (select rol from perfiles where id = auth.uid()));

drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes for select to authenticated using (true);
drop policy if exists clientes_write_admin on clientes;
create policy clientes_write_admin on clientes for insert to authenticated
  with check (public.es_admin());
drop policy if exists clientes_update_admin on clientes;
create policy clientes_update_admin on clientes for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
drop policy if exists clientes_delete_admin on clientes;
create policy clientes_delete_admin on clientes for delete to authenticated
  using (public.es_admin());

drop policy if exists informes_select on informes_generales;
create policy informes_select on informes_generales for select to authenticated
  using (true);
drop policy if exists informes_insert on informes_generales;
create policy informes_insert on informes_generales for insert to authenticated
  with check (true);
drop policy if exists informes_update on informes_generales;
create policy informes_update on informes_generales for update to authenticated
  using (true)
  with check (true);
drop policy if exists informes_delete_admin on informes_generales;
create policy informes_delete_admin on informes_generales for delete to authenticated
  using (true);

drop policy if exists moto_select on informes_motocompresor;
create policy moto_select on informes_motocompresor for select to authenticated
  using (true);
drop policy if exists moto_write on informes_motocompresor;
create policy moto_write on informes_motocompresor for insert to authenticated
  with check (true);
drop policy if exists moto_update on informes_motocompresor;
create policy moto_update on informes_motocompresor for update to authenticated
  using (true);
drop policy if exists moto_delete on informes_motocompresor;
create policy moto_delete on informes_motocompresor for delete to authenticated
  using (true);

drop policy if exists comp_select on informes_compresor;
create policy comp_select on informes_compresor for select to authenticated
  using (true);
drop policy if exists comp_write on informes_compresor;
create policy comp_write on informes_compresor for insert to authenticated
  with check (true);
drop policy if exists comp_update on informes_compresor;
create policy comp_update on informes_compresor for update to authenticated
  using (true);
drop policy if exists comp_delete on informes_compresor;
create policy comp_delete on informes_compresor for delete to authenticated
  using (true);

drop policy if exists veh_select on informes_vehiculos;
create policy veh_select on informes_vehiculos for select to authenticated
  using (true);
drop policy if exists veh_write on informes_vehiculos;
create policy veh_write on informes_vehiculos for insert to authenticated
  with check (true);
drop policy if exists veh_update on informes_vehiculos;
create policy veh_update on informes_vehiculos for update to authenticated
  using (true);
drop policy if exists veh_delete on informes_vehiculos;
create policy veh_delete on informes_vehiculos for delete to authenticated
  using (true);

drop policy if exists ge_select on informes_grupo_electrogeno;
create policy ge_select on informes_grupo_electrogeno for select to authenticated
  using (true);
drop policy if exists ge_write on informes_grupo_electrogeno;
create policy ge_write on informes_grupo_electrogeno for insert to authenticated
  with check (true);
drop policy if exists ge_update on informes_grupo_electrogeno;
create policy ge_update on informes_grupo_electrogeno for update to authenticated
  using (true);
drop policy if exists ge_delete on informes_grupo_electrogeno;
create policy ge_delete on informes_grupo_electrogeno for delete to authenticated
  using (true);

drop policy if exists archivos_select on informe_archivos;
create policy archivos_select on informe_archivos for select to authenticated
  using (true);
drop policy if exists archivos_insert on informe_archivos;
create policy archivos_insert on informe_archivos for insert to authenticated
  with check (true);
drop policy if exists archivos_update on informe_archivos;
create policy archivos_update on informe_archivos for update to authenticated
  using (true);
drop policy if exists archivos_delete on informe_archivos;
create policy archivos_delete on informe_archivos for delete to authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('informe-archivos', 'informe-archivos', false)
on conflict (id) do nothing;

drop policy if exists storage_upload on storage.objects;
create policy storage_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'informe-archivos');
drop policy if exists storage_select on storage.objects;
create policy storage_select on storage.objects for select to authenticated
  using (bucket_id = 'informe-archivos');
drop policy if exists storage_update on storage.objects;
create policy storage_update on storage.objects for update to authenticated
  using (bucket_id = 'informe-archivos');
drop policy if exists storage_delete on storage.objects;
create policy storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'informe-archivos');
