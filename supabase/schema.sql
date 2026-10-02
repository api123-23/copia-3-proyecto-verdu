create table if not exists perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'tecnico' check (rol in ('tecnico', 'admin', 'master')),
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

-- Tutorial de primer uso: fecha en que el usuario vio (o salteó) cada recorrido.
-- Se guarda en la cuenta para que no vuelva a aparecer aunque cambie de
-- celular o se borren los datos del navegador. Solo lo ven los usuarios
-- nuevos: al crear las columnas, los usuarios que ya existían quedan marcados.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfiles' and column_name = 'tutorial_lista_visto_en'
  ) then
    alter table perfiles add column tutorial_lista_visto_en timestamptz;
    alter table perfiles add column if not exists tutorial_informe_visto_en timestamptz;
    update perfiles set tutorial_lista_visto_en = now(), tutorial_informe_visto_en = now();
  end if;
end $$;
alter table perfiles add column if not exists tutorial_informe_visto_en timestamptz;

-- Roles: tecnico, admin (observador, solo lectura) y master.
-- La conversión histórica "admin → master" ya se aplicó una vez y NO se
-- repite: si se repitiera, cada ejecución de este archivo convertiría a todos
-- los observadores en master.
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check check (rol in ('tecnico', 'admin', 'master'));

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
  modelo text,
  numero_serie text,
  tecnico_id uuid not null default auth.uid() references auth.users (id),
  fecha_hora timestamptz not null,
  tipo_equipo text not null check (tipo_equipo in (
    'motocompresor', 'compresor', 'grupo_electrogeno', 'extraordinarios', 'vehiculos', 'maquinas_viales', 'secadores'
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
  sincronizado_en timestamptz,
  listo_para_enviar boolean not null default false
);

-- MIGRACIÓN CRÍTICA: debe ejecutarse inmediatamente después de la tabla base.
-- Se repite de forma idempotente más abajo junto con el resto de migraciones,
-- pero mantenerla aquí evita que un error posterior deje al cliente enviando
-- columnas que todavía no existen en instalaciones antiguas.
alter table public.informes_generales add column if not exists modelo text;
alter table public.informes_generales add column if not exists numero_serie text;
alter table public.informes_generales add column if not exists listo_para_enviar boolean not null default false;

create table if not exists informes_motocompresor (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro text,
  aceite_motor text check (aceite_motor in ('ok', 'alto', 'bajo')),
  aceite_unidad text check (aceite_unidad in ('ok', 'alto', 'bajo')),
  refrig_radiador text check (refrig_radiador in ('ok', 'alto', 'bajo')),
  estado_bateria text check (estado_bateria in ('ok', 'mal', 'no_tiene')),
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  carroceria text check (carroceria in ('ok', 'mal')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  presion_unidad_comp numeric(10, 2),
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no')),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  perdida_combustible text check (perdida_combustible in ('si', 'no'))
);

create table if not exists informes_compresor (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro text,
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  jabalina text check (jabalina in ('si', 'no')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  tension_linea numeric(10, 2),
  temp_ambiente numeric(10, 2),
  circuito_despresuriz text check (circuito_despresuriz in ('si', 'no')),
  circuito_arranque text check (circuito_arranque in ('ok', 'mal')),
  circuito_seguridad text check (circuito_seguridad in ('ok', 'mal')),
  circuito_electr text check (circuito_electr in ('ok', 'mal')),
  tiempo_y_delta text check (tiempo_y_delta in ('ok', 'bajo', 'alto', 'vsd')),
  diferencial text,
  perdida_aceite_unidad text check (perdida_aceite_unidad in ('si', 'no'))
);

create table if not exists informes_vehiculos (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro text,
  kilometros numeric(10, 2),
  aceite_motor text check (aceite_motor in ('ok', 'alto', 'bajo')),
  refrig_radiador text check (refrig_radiador in ('ok', 'alto', 'bajo')),
  estado_bateria text check (estado_bateria in ('ok', 'mal')),
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  carroceria text check (carroceria in ('ok', 'mal')),
  temp_ambiente numeric(10, 2),
  temp_refrigerante numeric(10, 2),
  aceite_caja text check (aceite_caja in ('optimo', 'alto', 'bajo')),
  aceite_diferencial text check (aceite_diferencial in ('optimo', 'alto', 'bajo')),
  aceite_hidraulico text check (aceite_hidraulico in ('optimo', 'alto', 'bajo')),
  aceite_convertidor text check (aceite_convertidor in ('optimo', 'alto', 'bajo')),
  perdida_aceite_motor text check (perdida_aceite_motor in ('si', 'no')),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  perdida_combustible text check (perdida_combustible in ('si', 'no'))
);

create table if not exists informes_secadores (
  informe_id uuid primary key references informes_generales (id) on delete cascade,
  horometro text,
  inst_electrica text check (inst_electrica in ('ok', 'mal')),
  carroceria text check (carroceria in ('ok', 'mal')),
  jabalina text check (jabalina in ('si', 'no')),
  aislacion_suelo text check (aislacion_suelo in ('si', 'no')),
  conec_purga text check (conec_purga in ('si', 'no')),
  tension_linea numeric(10, 2),
  perdida_refrigerante text check (perdida_refrigerante in ('si', 'no')),
  perdida_aire text check (perdida_aire in ('si', 'no')),
  temp_ambiente numeric(10, 2),
  pto_rocio text check (pto_rocio in ('optimo', 'alto', 'bajo')),
  circuito_seguridad text check (circuito_seguridad in ('ok', 'mal')),
  circuito_electr text check (circuito_electr in ('ok', 'mal'))
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
  ge_funcionamiento_presion_aceite text check (ge_funcionamiento_presion_aceite in ('ok', 'bajo', 'alto')),
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
  ge_funcionamiento_frecuencia text check (ge_funcionamiento_frecuencia in ('optimo', 'baja', 'alta')),
  ge_funcionamiento_tension_linea text check (ge_funcionamiento_tension_linea in ('optimo', 'baja', 'alta')),
  ge_funcionamiento_amperaje_f1 numeric(10, 2),
  ge_funcionamiento_amperaje_f2 numeric(10, 2),
  ge_funcionamiento_amperaje_f3 numeric(10, 2),
  ge_funcionamiento_tension_linea_carga text check (ge_funcionamiento_tension_linea_carga in ('ok', 'baja', 'alta')),
  ge_funcionamiento_temp_ambiente numeric(10, 2),
  ge_funcionamiento_temp_refrigerante numeric(10, 2),
  ge_funcionamiento_inspeccion_bateria text check (ge_funcionamiento_inspeccion_bateria in ('ok', 'mal')),
  ge_funcionamiento_accion_electrico text check (ge_funcionamiento_accion_electrico in ('si', 'no'))
);

create table if not exists informe_archivos (
  id uuid primary key,
  informe_id uuid not null references informes_generales (id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'firma_tecnico', 'firma_cliente')),
  categoria text check (categoria in ('inicial', 'desarrollo', 'repuestos', 'final', 'falla', 'horometro')),
  url text not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_informes_tecnico on informes_generales (tecnico_id);
create index if not exists idx_informes_fecha on informes_generales (fecha_hora);
create index if not exists idx_informes_cliente on informes_generales (cliente_id);
create index if not exists idx_archivos_informe on informe_archivos (informe_id);

-- INTEGRIDAD: garantiza ON DELETE CASCADE en las tablas dependientes..
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

-- Nuevas categorías de vehículos.
alter table informes_generales drop constraint if exists informes_generales_tipo_equipo_check;
alter table informes_generales add constraint informes_generales_tipo_equipo_check
  check (tipo_equipo in ('motocompresor', 'compresor', 'grupo_electrogeno', 'extraordinarios', 'vehiculos', 'maquinas_viales', 'secadores'));

alter table informes_vehiculos add column if not exists aceite_caja text check (aceite_caja in ('optimo', 'alto', 'bajo'));
alter table informes_vehiculos add column if not exists aceite_diferencial text check (aceite_diferencial in ('optimo', 'alto', 'bajo'));
alter table informes_vehiculos add column if not exists aceite_hidraulico text check (aceite_hidraulico in ('optimo', 'alto', 'bajo'));
alter table informes_vehiculos add column if not exists aceite_convertidor text check (aceite_convertidor in ('optimo', 'alto', 'bajo'));

select public.garantizar_cascade('informes_motocompresor');
select public.garantizar_cascade('informes_compresor');
select public.garantizar_cascade('informes_vehiculos');
select public.garantizar_cascade('informes_secadores');
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

-- Datos generales y modo de informe. Se agregan también para instalaciones
-- existentes, porque CREATE TABLE IF NOT EXISTS no modifica tablas previas.
alter table informes_generales add column if not exists modelo text;
alter table informes_generales add column if not exists numero_serie text;

-- Vehículos: horómetro y kilómetros son mediciones independientes y ambas
-- pueden quedar vacías.
alter table informes_vehiculos add column if not exists kilometros numeric(10, 2);

-- El horómetro puede contener lecturas alfanuméricas (por ejemplo, "sin display").
alter table informes_motocompresor alter column horometro type text using horometro::text;
alter table informes_motocompresor drop column if exists conec_purga;
alter table informes_motocompresor drop column if exists jabalina;
alter table informes_motocompresor drop column if exists presion_aceite_motor;
alter table informes_compresor drop column if exists circuito_refr_m;
alter table informes_compresor alter column horometro type text using horometro::text;
alter table informes_vehiculos alter column horometro type text using horometro::text;
alter table informes_secadores alter column horometro type text using horometro::text;

-- Compresor: se elimina refrigerante de motor y se conserva la pérdida de
-- aceite de unidad bajo su nombre histórico.
alter table informes_compresor drop column if exists temp_refrigerante;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'informes_compresor' and column_name = 'perdida_aceite_motor')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'informes_compresor' and column_name = 'perdida_aceite_unidad') then
    alter table informes_compresor rename column perdida_aceite_motor to perdida_aceite_unidad;
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'informes_compresor' and column_name = 'perdida_aceite_motor')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'informes_compresor' and column_name = 'perdida_aceite_unidad') then
    update informes_compresor set perdida_aceite_unidad = coalesce(perdida_aceite_unidad, perdida_aceite_motor);
    alter table informes_compresor drop column perdida_aceite_motor;
  end if;
end $$;
alter table informes_compresor add column if not exists perdida_aceite_unidad text;

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
-- seguro: convierte valores viejos (si/no) y conserva intactos los válidos (ok/mal).
update informes_vehiculos
set estado_bateria = case
  when lower(trim(estado_bateria)) = 'si' then 'ok'
  when lower(trim(estado_bateria)) = 'no' then 'mal'
  when lower(trim(estado_bateria)) in ('ok', 'mal') then lower(trim(estado_bateria))
  else null
end;
alter table informes_vehiculos add constraint informes_vehiculos_estado_bateria_check
  check (estado_bateria in ('ok', 'mal'));

-- MOTODES: batería también pasa a Ok/Mal
select public.dropar_checks_de_columna('informes_motocompresor', 'estado_bateria');
-- seguro: convierte valores viejos (si/no) y conserva intactos los válidos (ok/mal/no_tiene).
update informes_motocompresor
set estado_bateria = case
  when lower(trim(estado_bateria)) = 'si' then 'ok'
  when lower(trim(estado_bateria)) = 'no' then 'mal'
  when lower(trim(estado_bateria)) in ('ok', 'mal', 'no_tiene') then lower(trim(estado_bateria))
  else null
end;
alter table informes_motocompresor add constraint informes_motocompresor_estado_bateria_check
  check (estado_bateria in ('ok', 'mal', 'no_tiene'));

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
-- seguro: solo cambia los valores viejos si/no; cualquier otro valor queda igual.
update informes_motocompresor set aceite_unidad = case
  when aceite_unidad = 'si' then 'ok'
  when aceite_unidad = 'no' then 'bajo'
  else aceite_unidad end;
alter table informes_motocompresor add constraint informes_motocompresor_aceite_unidad_check
  check (aceite_unidad in ('ok', 'bajo', 'alto'));

-- COMPRESOR: Aceite Unidad no corresponde a este equipo; la pérdida de aceite
-- de unidad es un control diferente y se conserva.
alter table informes_compresor drop column if exists aceite_unidad;
select public.dropar_checks_de_columna('informes_compresor', 'perdida_aceite_unidad');
-- seguro: conserva intactos los valores válidos (si/no).
update informes_compresor set perdida_aceite_unidad = case
  when lower(trim(perdida_aceite_unidad)) = 'si' then 'si'
  when lower(trim(perdida_aceite_unidad)) = 'no' then 'no'
  else null end;
alter table informes_compresor add constraint informes_compresor_perdida_aceite_unidad_check
  check (perdida_aceite_unidad in ('si', 'no'));

-- COMPRESOR: tiempo de conmutación Y-Δ pasa a ok/bajo/alto/vsd (legacy si/no/mal).
-- VSD = arranque por variador de velocidad. Se conserva en re-ejecuciones.
select public.dropar_checks_de_columna('informes_compresor', 'tiempo_y_delta');
update informes_compresor set tiempo_y_delta = case
  when lower(trim(tiempo_y_delta)) = 'si' then 'ok'
  when lower(trim(tiempo_y_delta)) in ('no', 'mal') then 'bajo'
  when lower(trim(tiempo_y_delta)) in ('ok', 'bajo', 'alto', 'vsd') then lower(trim(tiempo_y_delta))
  else null end
  where tiempo_y_delta is not null;
alter table informes_compresor add constraint informes_compresor_tiempo_y_delta_check
  check (tiempo_y_delta in ('ok', 'bajo', 'alto', 'vsd'));

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

-- GE: amperaje de fases pasa a numérico (migración vieja, de texto a número).
-- IMPORTANTE: solo se convierte si la columna todavía NO es numérica, y nunca se
-- vacían valores. (Antes había acá un "update ... set amperaje = null" sin
-- condición que borraba los amperajes de TODOS los informes cada vez que se
-- ejecutaba este archivo.)
do $$
declare
  col text;
begin
  foreach col in array array['ge_funcionamiento_amperaje_f1', 'ge_funcionamiento_amperaje_f2', 'ge_funcionamiento_amperaje_f3'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'informes_grupo_electrogeno'
        and column_name = col and data_type <> 'numeric'
    ) then
      perform public.dropar_checks_de_columna('informes_grupo_electrogeno', col);
      -- Texto que no es un número válido no se puede convertir: queda vacío.
      execute format(
        'alter table public.informes_grupo_electrogeno alter column %I type numeric(10, 2) using (case when trim(%I::text) ~ ''^-?[0-9]+([.,][0-9]+)?$'' then replace(trim(%I::text), '','', ''.'')::numeric else null end)',
        col, col, col
      );
    end if;
  end loop;
end $$;

-- GE: inspección de batería pasa a Ok/Mal (legacy si/no)
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_inspeccion_bateria');
update informes_grupo_electrogeno set ge_funcionamiento_inspeccion_bateria = case
  when ge_funcionamiento_inspeccion_bateria = 'no' then 'mal'
  when ge_funcionamiento_inspeccion_bateria = 'si' then 'ok'
  else null end
  where ge_funcionamiento_inspeccion_bateria in ('si', 'no');
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_ge_funcionamiento_inspeccion_bateria_check
  check (ge_funcionamiento_inspeccion_bateria in ('ok', 'mal'));

-- MOTOCOMPRESOR: la batería también puede indicar que el equipo no tiene batería.
select public.dropar_checks_de_columna('informes_motocompresor', 'estado_bateria');
alter table informes_motocompresor add constraint informes_motocompresor_estado_bateria_no_tiene_check
  check (estado_bateria in ('ok', 'mal', 'no_tiene'));

-- GRUPO ELECTRÓGENO: nuevos dominios y temperatura del líquido refrigerante.
select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_presion_aceite');
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_presion_aceite_alto_check
  check (ge_funcionamiento_presion_aceite in ('ok', 'bajo', 'alto'));

select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_frecuencia');
update informes_grupo_electrogeno set ge_funcionamiento_frecuencia = 'optimo'
where ge_funcionamiento_frecuencia = 'ok';
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_frecuencia_optimo_check
  check (ge_funcionamiento_frecuencia in ('optimo', 'baja', 'alta'));

select public.dropar_checks_de_columna('informes_grupo_electrogeno', 'ge_funcionamiento_tension_linea');
update informes_grupo_electrogeno set ge_funcionamiento_tension_linea = 'optimo'
where ge_funcionamiento_tension_linea = 'ok';
alter table informes_grupo_electrogeno add constraint informes_grupo_electrogeno_tension_optimo_check
  check (ge_funcionamiento_tension_linea in ('optimo', 'baja', 'alta'));

alter table informes_grupo_electrogeno
  add column if not exists ge_funcionamiento_temp_refrigerante numeric(10, 2);

-- Fotos: categoría exclusiva para el horómetro.
select public.dropar_checks_de_columna('informe_archivos', 'categoria');
alter table informe_archivos add constraint informe_archivos_categoria_horometro_check
  check (categoria in ('inicial', 'desarrollo', 'repuestos', 'final', 'falla', 'horometro'));

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
-- NUMERACIÓN SIN SALTOS (reemplaza a la secuencia).
-- Una secuencia de PostgreSQL nunca devuelve un número aunque la operación
-- falle, y la app pedía el número ANTES de guardar el informe: si algo fallaba
-- en el medio, ese número quedaba salteado para siempre.
-- Ahora el número sale de este contador DENTRO de la misma transacción que
-- guarda el informe: si el guardado falla, el contador también se deshace.
-- La fila queda bloqueada durante la transacción, así dos informes que llegan
-- a la vez reciben números distintos y consecutivos.
create table if not exists public.numeracion_informes (
  id boolean primary key default true check (id),
  ultimo integer not null
);
alter table public.numeracion_informes enable row level security;
-- Sin políticas: solo las funciones del servidor pueden tocar el contador.

-- Punto de partida (SOLO la primera vez que se crea el contador): el mayor
-- número ya usado o ya reservado por la secuencia anterior. Después el
-- contador no se toca al re-ejecutar este archivo, salvo que no quede ningún
-- informe (entonces vuelve a 0 y el próximo es el 1).
do $$
declare
  maximo integer;
  reservado integer := 0;
begin
  select coalesce(max(numero_registro), 0) into maximo from public.informes_generales;
  if not exists (select 1 from public.numeracion_informes) then
    if exists (select 1 from pg_class where relname = 'numero_informe_seq' and relkind = 'S') then
      select case when is_called then last_value else last_value - 1 end into reservado
      from public.numero_informe_seq;
    end if;
    insert into public.numeracion_informes (id, ultimo)
      values (true, case when maximo = 0 then 0 else greatest(maximo, reservado) end);
  elsif maximo = 0 then
    update public.numeracion_informes set ultimo = 0 where id;
  end if;
end $$;

-- Uso interno: la llaman las funciones que guardan el informe.
create or replace function public.tomar_numero_informe()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.numeracion_informes set ultimo = ultimo + 1 where id returning ultimo into n;
  if n is null then
    insert into public.numeracion_informes (id, ultimo)
      values (true, coalesce((select max(numero_registro) from public.informes_generales), 0) + 1)
    on conflict (id) do update set ultimo = public.numeracion_informes.ultimo + 1
    returning ultimo into n;
  end if;
  return n;
end;
$$;
revoke all on function public.tomar_numero_informe() from public, anon, authenticated;

-- Compatibilidad con versiones viejas de la app que todavía piden el número
-- por adelantado. Las versiones nuevas ya no la usan.
-- Ya NO consume números: solo informa cuál sería el próximo. El número real lo
-- asigna sincronizar_informe_completo al guardar. Así nadie puede dejar huecos
-- en la numeración llamándola, y sin sesión no se puede usar.
create or replace function public.siguiente_numero_informe()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select n.ultimo from public.numeracion_informes n where n.id), 0)::bigint + 1;
$$;

revoke all on function public.siguiente_numero_informe() from public, anon;
grant execute on function public.siguiente_numero_informe() to authenticated;
grant usage on sequence public.numero_informe_seq to authenticated;

-- La secuencia anterior ya no numera informes; se mantiene alineada con el
-- contador solo por compatibilidad.
do $$
declare
  ultimo integer;
begin
  select coalesce((select n.ultimo from public.numeracion_informes n where n.id), 0) into ultimo;
  if ultimo = 0 then
    perform setval('public.numero_informe_seq', 1, false);
  else
    perform setval('public.numero_informe_seq', ultimo, true);
  end if;
end $$;

-- Se retiran el trigger y la función de la numeración automática anterior.
drop trigger if exists trg_asignar_numero on informes_generales;
drop function if exists public.asignar_numero_informe();

-- Se retira el default: la única fuente de numeración es siguiente_numero_informe().
alter table informes_generales
  alter column numero_registro drop default;

-- Se retira el mecanismo anterior (tabla contador + trigger viejo)
-- (la tabla vieja se llamaba contador_informes; el contador nuevo es numeracion_informes)
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
  select public.rol_actual() = 'master';
$$;

create or replace function public.puede_editar_informe(informe uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    -- El master puede editar cualquier informe. El técnico, solo los suyos que
    -- todavía no firmó el cliente: una vez firmado, el informe no se modifica.
    select public.es_admin()
    or exists (
      select 1
      from public.informes_generales g
      where g.id = informe
        and public.rol_actual() = 'tecnico'
        and g.tecnico_id = auth.uid()
        and g.estado_firma <> 'firmado'
    );
$$;

-- Guarda el informe general sin depender de que el técnico pueda leer una fila
-- que acaba de pasar a firmado. Valida propietario/rol y conserva el técnico
-- original al editar un informe existente.
create or replace function public.guardar_informe_general_sync(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  informe_id uuid := (p_payload->>'id')::uuid;
  existente public.informes_generales%rowtype;
  tecnico uuid;
  numero integer;
begin
  if uid is null then
    raise exception 'Sesión no autenticada' using errcode = '42501';
  end if;

  select * into existente
  from public.informes_generales
  where id = informe_id;

  if existente.id is not null then
    -- Informe propio ya firmado por el cliente (reintento de un envío que ya
    -- se guardó): no se modifica nada y se responde OK.
    if existente.estado_firma = 'firmado' and not public.es_admin() and existente.tecnico_id = uid then
      return jsonb_build_object('numero_registro', existente.numero_registro);
    end if;
    if not public.puede_editar_informe(informe_id) then
      raise exception 'El técnico no puede editar este informe' using errcode = '42501';
    end if;
    tecnico := existente.tecnico_id;
    -- Un informe ya numerado conserva SIEMPRE su número.
    numero := coalesce(existente.numero_registro, public.tomar_numero_informe());

    update public.informes_generales set
      numero_registro = numero,
      cliente_id = nullif(p_payload->>'cliente_id', '')::uuid,
      cliente_nombre = p_payload->>'cliente_nombre',
      cliente_telefono = p_payload->>'cliente_telefono',
      cliente_direccion = p_payload->>'cliente_direccion',
      modelo = p_payload->>'modelo',
      numero_serie = p_payload->>'numero_serie',
      tecnico_id = tecnico,
      fecha_hora = (p_payload->>'fecha_hora')::timestamptz,
      tipo_equipo = p_payload->>'tipo_equipo',
      observaciones = p_payload->>'observaciones',
      observaciones_ia = p_payload->>'observaciones_ia',
      maquina_operativa = (p_payload->>'maquina_operativa')::boolean,
      horas_trabajadas = (p_payload->>'horas_trabajadas')::numeric,
      repuestos_air_power = p_payload->>'repuestos_air_power',
      repuestos_cliente = p_payload->>'repuestos_cliente',
      requiere_cotizacion = coalesce((p_payload->>'requiere_cotizacion')::boolean, false),
      cotizacion_notas = p_payload->>'cotizacion_notas',
      cotizacion_notas_ia = p_payload->>'cotizacion_notas_ia',
      estado_firma = p_payload->>'estado_firma',
      cerrado = coalesce((p_payload->>'cerrado')::boolean, false),
      firma_tecnico_url = p_payload->>'firma_tecnico_url',
      firma_cliente_url = p_payload->>'firma_cliente_url',
      aclaracion_firma = p_payload->>'aclaracion_firma',
      firmado_en = (p_payload->>'firmado_en')::timestamptz,
      actualizado_en = coalesce((p_payload->>'actualizado_en')::timestamptz, now()),
      sincronizado_en = (p_payload->>'sincronizado_en')::timestamptz
    where id = informe_id;
  else
    -- Solo técnicos y master crean informes (el observador no).
    if public.rol_actual() not in ('tecnico', 'master') then
      raise exception 'Este usuario no puede crear informes' using errcode = '42501';
    end if;
    tecnico := coalesce(nullif(p_payload->>'tecnico_id', '')::uuid, uid);
    if not public.es_admin() and tecnico <> uid then
      raise exception 'El técnico no puede crear un informe para otro usuario' using errcode = '42501';
    end if;
    -- Un informe nuevo SIEMPRE toma el número del contador (se ignora cualquier
    -- número que traiga el celular: así nunca quedan huecos).
    numero := public.tomar_numero_informe();

    insert into public.informes_generales (
      id, numero_registro, cliente_id, cliente_nombre, cliente_telefono,
      cliente_direccion, modelo, numero_serie, tecnico_id, fecha_hora,
      tipo_equipo, observaciones, observaciones_ia, maquina_operativa,
      horas_trabajadas, repuestos_air_power, repuestos_cliente,
      requiere_cotizacion, cotizacion_notas, cotizacion_notas_ia,
      estado_firma, cerrado, firma_tecnico_url, firma_cliente_url,
      aclaracion_firma, firmado_en, creado_en, actualizado_en, sincronizado_en
    ) values (
      informe_id, numero, nullif(p_payload->>'cliente_id', '')::uuid,
      p_payload->>'cliente_nombre', p_payload->>'cliente_telefono',
      p_payload->>'cliente_direccion', p_payload->>'modelo',
      p_payload->>'numero_serie', tecnico, (p_payload->>'fecha_hora')::timestamptz,
      p_payload->>'tipo_equipo', p_payload->>'observaciones',
      p_payload->>'observaciones_ia', (p_payload->>'maquina_operativa')::boolean,
      (p_payload->>'horas_trabajadas')::numeric, p_payload->>'repuestos_air_power',
      p_payload->>'repuestos_cliente', coalesce((p_payload->>'requiere_cotizacion')::boolean, false),
      p_payload->>'cotizacion_notas', p_payload->>'cotizacion_notas_ia',
      coalesce(p_payload->>'estado_firma', 'pendiente'),
      coalesce((p_payload->>'cerrado')::boolean, false), p_payload->>'firma_tecnico_url',
      p_payload->>'firma_cliente_url', p_payload->>'aclaracion_firma',
      (p_payload->>'firmado_en')::timestamptz, (p_payload->>'creado_en')::timestamptz,
      coalesce((p_payload->>'actualizado_en')::timestamptz, now()),
      (p_payload->>'sincronizado_en')::timestamptz
    );
  end if;

  return jsonb_build_object('numero_registro', numero);
end;
$$;

revoke all on function public.guardar_informe_general_sync(jsonb) from public;
grant execute on function public.guardar_informe_general_sync(jsonb) to authenticated;

-- Sincronización atómica: informe general, valores técnicos y metadatos de
-- archivos se guardan en una sola transacción. Storage se gestiona desde el
-- cliente y se revierte allí si esta función devuelve error.
create or replace function public.sincronizar_informe_completo(
  p_informe jsonb,
  p_valores jsonb default null,
  p_archivos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  informe_id uuid := (p_informe->>'id')::uuid;
  existente public.informes_generales%rowtype;
  tecnico uuid;
  numero integer;
  tabla text;
  columnas_update text;
  desconocidos text;
begin
  if uid is null then
    raise exception 'Sesión no autenticada' using errcode = '42501';
  end if;

  -- Si el mismo informe llega dos veces a la vez, se procesan en fila: el
  -- segundo ya lo ve creado y no consume otro número.
  perform pg_advisory_xact_lock(hashtext(informe_id::text));

  select * into existente
  from public.informes_generales
  where id = informe_id;

  if existente.id is not null then
    -- Informe propio ya firmado por el cliente: el técnico no puede modificarlo.
    -- Si llega igual es un reintento de un envío que ya se guardó completo (por
    -- ejemplo, se cortó la señal antes de recibir la respuesta): se responde OK
    -- sin tocar nada, así el celular lo da por subido.
    if existente.estado_firma = 'firmado' and not public.es_admin() and existente.tecnico_id = uid then
      return jsonb_build_object('numero_registro', existente.numero_registro);
    end if;
    if not public.puede_editar_informe(informe_id) then
      raise exception 'El usuario no puede editar este informe' using errcode = '42501';
    end if;
    tecnico := existente.tecnico_id;
    -- Un informe ya numerado conserva SIEMPRE su número.
    numero := existente.numero_registro;
    if numero is null then
      numero := public.tomar_numero_informe();
    end if;
  else
    -- Solo técnicos y master crean informes (el observador no).
    if public.rol_actual() not in ('tecnico', 'master') then
      raise exception 'Este usuario no puede crear informes' using errcode = '42501';
    end if;
    tecnico := coalesce(nullif(p_informe->>'tecnico_id', '')::uuid, uid);
    if not public.es_admin() and tecnico <> uid then
      raise exception 'El técnico no puede crear un informe para otro usuario' using errcode = '42501';
    end if;
    -- Un informe nuevo SIEMPRE toma el número del contador, en la misma
    -- transacción que lo guarda (si algo falla, el número no se pierde). Se
    -- ignora cualquier número que traiga el celular: así nunca quedan huecos.
    numero := public.tomar_numero_informe();
  end if;

  -- Ningún dato se descarta en silencio: si llega un campo que la base no
  -- tiene, se rechaza el envío (el informe queda en el celular con el error a
  -- la vista) en lugar de guardar el informe sin ese dato.
  select string_agg(k, ', ') into desconocidos
  from jsonb_object_keys(p_informe) k
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'informes_generales' and c.column_name = k
  );
  if desconocidos is not null then
    raise exception 'La base no tiene estos datos del informe: %', desconocidos using errcode = '22023';
  end if;

  p_informe := jsonb_set(p_informe, '{numero_registro}', to_jsonb(numero), true);
  p_informe := jsonb_set(p_informe, '{tecnico_id}', to_jsonb(tecnico), true);
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'informes_generales'
      and column_name = 'modo_informe'
  ) then
    p_informe := jsonb_set(p_informe, '{modo_informe}', '"comun"'::jsonb, true);
  end if;

  select string_agg(format('%1$I = EXCLUDED.%1$I', column_name), ', ' order by ordinal_position)
    into columnas_update
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'informes_generales'
    and column_name not in ('id', 'tecnico_id', 'creado_en');

  execute format(
    'insert into public.informes_generales
       select * from jsonb_populate_record(null::public.%I, $1)
     on conflict (id) do update set %s',
    'informes_generales', columnas_update
  ) using p_informe;

  tabla := case p_informe->>'tipo_equipo'
    when 'motocompresor' then 'informes_motocompresor'
     when 'compresor' then 'informes_compresor'
     when 'vehiculos' then 'informes_vehiculos'
     when 'maquinas_viales' then 'informes_vehiculos'
     when 'secadores' then 'informes_secadores'
    when 'grupo_electrogeno' then 'informes_grupo_electrogeno'
    else null
  end;

  if tabla is not null and p_valores is not null then
    -- Los valores técnicos se guardan SIEMPRE en el informe que se sincroniza
    -- (nunca en otro, aunque el pedido traiga otro informe_id).
    p_valores := jsonb_set(p_valores, '{informe_id}', to_jsonb((p_informe->>'id')::uuid), true);
    select string_agg(k, ', ') into desconocidos
    from jsonb_object_keys(p_valores) k
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = tabla and c.column_name = k
    );
    if desconocidos is not null then
      raise exception 'La base no tiene estos valores técnicos: %', desconocidos using errcode = '22023';
    end if;
    select string_agg(format('%1$I = EXCLUDED.%1$I', column_name), ', ' order by ordinal_position)
      into columnas_update
    from information_schema.columns
    where table_schema = 'public'
      and table_name = tabla
      and column_name <> 'informe_id';

    execute format(
      'insert into public.%I
         select * from jsonb_populate_record(null::public.%I, $1)
       on conflict (informe_id) do update set %s',
      tabla, tabla, columnas_update
    ) using p_valores;
  end if;

  -- Si cambió el tipo de equipo, los valores técnicos del tipo anterior quedan
  -- huérfanos en otra tabla: se borran de todas las tablas de valores salvo la
  -- del tipo actual (para 'extraordinarios' tabla es null y se borran todos).
  -- Se usa (p_informe->>'id')::uuid y no la variable informe_id para evitar la
  -- ambigüedad con la columna del mismo nombre.
  declare
    t text;
  begin
    foreach t in array array[
      'informes_motocompresor', 'informes_compresor', 'informes_vehiculos',
      'informes_secadores', 'informes_grupo_electrogeno'
    ] loop
      if t is distinct from tabla and to_regclass('public.' || t) is not null then
        execute format('delete from public.%I where informe_id = $1', t)
          using (p_informe->>'id')::uuid;
      end if;
    end loop;
  end;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_archivos, '[]'::jsonb)) as x(
      id uuid,
      informe_id uuid,
      tipo text,
      categoria text,
      url text
    )
    where x.informe_id is distinct from (p_informe->>'id')::uuid
  ) then
    raise exception 'Un archivo no pertenece al informe sincronizado' using errcode = '22023';
  end if;

  -- Un archivo ya registrado en OTRO informe no se puede mover a este.
  if exists (
    select 1
    from public.informe_archivos a
    join jsonb_to_recordset(coalesce(p_archivos, '[]'::jsonb)) as x(id uuid) on x.id = a.id
    where a.informe_id <> (p_informe->>'id')::uuid
  ) then
    raise exception 'Un archivo pertenece a otro informe' using errcode = '22023';
  end if;

  -- Fotos que el usuario eliminó en la app (vienen marcadas con "eliminado").
  -- Solo se borran las pedidas explícitamente y solo de este informe.
  delete from public.informe_archivos a
  using jsonb_to_recordset(coalesce(p_archivos, '[]'::jsonb)) as x(id uuid, eliminado boolean)
  where coalesce(x.eliminado, false)
    and a.id = x.id
    and a.informe_id = (p_informe->>'id')::uuid
    and a.tipo = 'foto';

  delete from public.informe_archivos a
  where a.informe_id = (p_informe->>'id')::uuid
    and a.tipo in ('firma_tecnico', 'firma_cliente')
    and not exists (
      select 1
      from jsonb_to_recordset(coalesce(p_archivos, '[]'::jsonb)) as f(
        id uuid,
        informe_id uuid,
        tipo text,
        categoria text,
        url text
      )
      where f.id = a.id
    );

  if jsonb_array_length(coalesce(p_archivos, '[]'::jsonb)) > 0 then
    insert into public.informe_archivos (id, informe_id, tipo, categoria, url)
      select x.id, x.informe_id, x.tipo, x.categoria, x.url
      from jsonb_to_recordset(p_archivos) as x(
        id uuid,
        informe_id uuid,
        tipo text,
        categoria text,
        url text,
        eliminado boolean
      )
      where not coalesce(x.eliminado, false)
    on conflict (id) do update set
      informe_id = excluded.informe_id,
      tipo = excluded.tipo,
      categoria = excluded.categoria,
      url = excluded.url;
  end if;

  return jsonb_build_object('numero_registro', numero);
end;
$$;

revoke all on function public.sincronizar_informe_completo(jsonb, jsonb, jsonb) from public;
grant execute on function public.sincronizar_informe_completo(jsonb, jsonb, jsonb) to authenticated;

-- Estadísticas agregadas: solo administradores, sin transferir todos los
-- informes al navegador. Los meses se cuentan en horario de Córdoba
-- (Argentina): un informe del 30/09 a las 23:00 cuenta en septiembre.
create or replace function public.estadisticas_informes(
  p_desde date,
  p_hasta date,
  p_mes date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultado jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden consultar estadísticas' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'mensuales', coalesce((
      select jsonb_agg(jsonb_build_object('mes', to_char(q.mes, 'YYYY-MM'), 'cantidad', q.cantidad) order by q.mes)
      from (
        select m.mes, coalesce(c.cantidad, 0)::integer as cantidad
        from generate_series(date_trunc('month', p_desde::timestamp), date_trunc('month', p_hasta::timestamp), interval '1 month') as m(mes)
        left join lateral (
          select count(*)::integer as cantidad
          from public.informes_generales g
          where (g.fecha_hora at time zone 'America/Argentina/Cordoba') >= m.mes
            and (g.fecha_hora at time zone 'America/Argentina/Cordoba') < m.mes + interval '1 month'
        ) c on true
      ) q
    ), '[]'::jsonb),
    'tecnicos', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'nombre', q.nombre, 'cantidad', q.cantidad) order by q.cantidad desc, q.id)
      from (
        select
          coalesce(g.tecnico_id::text, 'sin-asignar') as id,
          coalesce(nullif(trim(concat_ws(' ', p.nombre, p.apellido)), ''), p.email, 'Sin técnico') as nombre,
          count(*)::integer as cantidad
        from public.informes_generales g
        left join public.perfiles p on p.id = g.tecnico_id
        where (g.fecha_hora at time zone 'America/Argentina/Cordoba') >= date_trunc('month', p_mes::timestamp)
          and (g.fecha_hora at time zone 'America/Argentina/Cordoba') < date_trunc('month', p_mes::timestamp) + interval '1 month'
        group by g.tecnico_id, p.nombre, p.apellido, p.email
      ) q
    ), '[]'::jsonb),
    'equipos', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', q.tipo, 'cantidad', q.cantidad) order by q.cantidad desc, q.tipo)
      from (
        select g.tipo_equipo as tipo, count(*)::integer as cantidad
        from public.informes_generales g
        where (g.fecha_hora at time zone 'America/Argentina/Cordoba') >= date_trunc('month', p_mes::timestamp)
          and (g.fecha_hora at time zone 'America/Argentina/Cordoba') < date_trunc('month', p_mes::timestamp) + interval '1 month'
        group by g.tipo_equipo
      ) q
    ), '[]'::jsonb)
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.estadisticas_informes(date, date, date) from public;
grant execute on function public.estadisticas_informes(date, date, date) to authenticated;

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

-- Visibilidad: los técnicos solo pueden consultar sus informes sin firma de
-- cliente; los administradores pueden consultar todos.
create or replace function public.puede_ver_informe(informe uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rol_actual() in ('admin', 'master')
    or exists (
      select 1
      from public.informes_generales g
      where g.id = informe
      and g.tecnico_id = auth.uid()
      and g.estado_firma <> 'firmado'
    );
$$;

alter table perfiles enable row level security;
alter table clientes enable row level security;
alter table informes_generales enable row level security;
alter table informes_motocompresor enable row level security;
alter table informes_compresor enable row level security;
alter table informes_vehiculos enable row level security;
alter table informes_secadores enable row level security;
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
  using (public.rol_actual() in ('admin', 'master') or (tecnico_id = auth.uid() and estado_firma <> 'firmado'));
drop policy if exists informes_insert on informes_generales;
create policy informes_insert on informes_generales for insert to authenticated
  with check (public.es_admin() or (public.rol_actual() = 'tecnico' and tecnico_id = auth.uid()));
drop policy if exists informes_update on informes_generales;
create policy informes_update on informes_generales for update to authenticated
  using (public.puede_editar_informe(id))
  with check (public.puede_editar_informe(id));
drop policy if exists informes_delete_admin on informes_generales;
create policy informes_delete_admin on informes_generales for delete to authenticated
  using (public.es_admin());

drop policy if exists moto_select on informes_motocompresor;
create policy moto_select on informes_motocompresor for select to authenticated
  using (public.puede_ver_informe(informe_id));
drop policy if exists moto_write on informes_motocompresor;
create policy moto_write on informes_motocompresor for insert to authenticated
  with check (public.puede_editar_informe(informe_id));
drop policy if exists moto_update on informes_motocompresor;
create policy moto_update on informes_motocompresor for update to authenticated
  using (public.puede_editar_informe(informe_id));
drop policy if exists moto_delete on informes_motocompresor;
create policy moto_delete on informes_motocompresor for delete to authenticated
  using (public.es_admin());

drop policy if exists comp_select on informes_compresor;
create policy comp_select on informes_compresor for select to authenticated
  using (public.puede_ver_informe(informe_id));
drop policy if exists comp_write on informes_compresor;
create policy comp_write on informes_compresor for insert to authenticated
  with check (public.puede_editar_informe(informe_id));
drop policy if exists comp_update on informes_compresor;
create policy comp_update on informes_compresor for update to authenticated
  using (public.puede_editar_informe(informe_id));
drop policy if exists comp_delete on informes_compresor;
create policy comp_delete on informes_compresor for delete to authenticated
  using (public.es_admin());

drop policy if exists veh_select on informes_vehiculos;
create policy veh_select on informes_vehiculos for select to authenticated
  using (public.puede_ver_informe(informe_id));
drop policy if exists veh_write on informes_vehiculos;
create policy veh_write on informes_vehiculos for insert to authenticated
  with check (public.puede_editar_informe(informe_id));
drop policy if exists veh_update on informes_vehiculos;
create policy veh_update on informes_vehiculos for update to authenticated
  using (public.puede_editar_informe(informe_id));
drop policy if exists veh_delete on informes_vehiculos;
create policy veh_delete on informes_vehiculos for delete to authenticated
  using (public.es_admin());

drop policy if exists sec_select on informes_secadores;
create policy sec_select on informes_secadores for select to authenticated
  using (public.puede_ver_informe(informe_id));
drop policy if exists sec_write on informes_secadores;
create policy sec_write on informes_secadores for insert to authenticated
  with check (public.puede_editar_informe(informe_id));
drop policy if exists sec_update on informes_secadores;
create policy sec_update on informes_secadores for update to authenticated
  using (public.puede_editar_informe(informe_id));
drop policy if exists sec_delete on informes_secadores;
create policy sec_delete on informes_secadores for delete to authenticated
  using (public.es_admin());

drop policy if exists ge_select on informes_grupo_electrogeno;
create policy ge_select on informes_grupo_electrogeno for select to authenticated
  using (public.puede_ver_informe(informe_id));
drop policy if exists ge_write on informes_grupo_electrogeno;
create policy ge_write on informes_grupo_electrogeno for insert to authenticated
  with check (public.puede_editar_informe(informe_id));
drop policy if exists ge_update on informes_grupo_electrogeno;
create policy ge_update on informes_grupo_electrogeno for update to authenticated
  using (public.puede_editar_informe(informe_id));
drop policy if exists ge_delete on informes_grupo_electrogeno;
create policy ge_delete on informes_grupo_electrogeno for delete to authenticated
  using (public.es_admin());

drop policy if exists archivos_select on informe_archivos;
create policy archivos_select on informe_archivos for select to authenticated
  using (public.puede_ver_informe(informe_id));
drop policy if exists archivos_insert on informe_archivos;
create policy archivos_insert on informe_archivos for insert to authenticated
  with check (public.puede_editar_informe(informe_id));
drop policy if exists archivos_update on informe_archivos;
create policy archivos_update on informe_archivos for update to authenticated
  using (public.puede_editar_informe(informe_id));
drop policy if exists archivos_delete on informe_archivos;
create policy archivos_delete on informe_archivos for delete to authenticated
  using (public.es_admin());

-- Los informes y sus tablas hijas SOLO se escriben a través de las funciones
-- sincronizar_informe_completo / guardar_informe_general_sync (security
-- definer, dueño postgres), que validan numeración, dueño y firma. Sin esto un
-- técnico podía hacer PATCH/INSERT directo por la API (por ejemplo cambiar el
-- numero_registro de su informe y trabar la numeración de todos). Se conservan
-- los permisos de lectura y de borrado (el borrado sigue limitado por RLS).
-- Las políticas de insert/update quedan pero ya no tienen efecto.
revoke insert, update on table public.informes_generales from anon, authenticated;
revoke insert, update on table public.informes_motocompresor from anon, authenticated;
revoke insert, update on table public.informes_compresor from anon, authenticated;
revoke insert, update on table public.informes_vehiculos from anon, authenticated;
revoke insert, update on table public.informes_secadores from anon, authenticated;
revoke insert, update on table public.informes_grupo_electrogeno from anon, authenticated;
revoke insert, update on table public.informe_archivos from anon, authenticated;

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
