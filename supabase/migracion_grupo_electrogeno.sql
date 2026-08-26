-- Migración: Tabla de Grupo Electrógeno
-- Ejecutar en Supabase SQL Editor

create table if not exists informes_grupo_electrogeno (
  informe_id uuid primary key references informes_generales (id) on delete cascade,

  -- Verificar con motor detenido
  ge_motor_detenido_aceite_motor text check (ge_motor_detenido_aceite_motor in ('ok', 'bajo')),
  ge_motor_detenido_agua_radiador text check (ge_motor_detenido_agua_radiador in ('ok', 'bajo')),
  ge_motor_detenido_restriccion_aire text check (ge_motor_detenido_restriccion_aire in ('si', 'no')),
  ge_motor_detenido_tension_correas text check (ge_motor_detenido_tension_correas in ('ok', 'mal')),
  ge_motor_detenido_estado_baterias text check (ge_motor_detenido_estado_baterias in ('ok', 'mal')),
  ge_motor_detenido_inst_electrica text check (ge_motor_detenido_inst_electrica in ('ok', 'mal')),
  ge_motor_detenido_cableado_distrib text check (ge_motor_detenido_cableado_distrib in ('ok', 'mal')),
  ge_motor_detenido_cubo_ventilador text check (ge_motor_detenido_cubo_ventilador in ('ok', 'mal')),
  ge_motor_detenido_ajuste_motor text check (ge_motor_detenido_ajuste_motor in ('si', 'no')),
  ge_motor_detenido_union_tubo_aire text check (ge_motor_detenido_union_tubo_aire in ('ok', 'mal')),
  ge_motor_detenido_lineas_combustible text check (ge_motor_detenido_lineas_combustible in ('ok', 'mal')),
  ge_motor_detenido_dca_anticongelante text check (ge_motor_detenido_dca_anticongelante in ('ok', 'mal')),
  ge_motor_detenido_ajuste_inyectores text check (ge_motor_detenido_ajuste_inyectores in ('si', 'no')),
  ge_motor_detenido_calibre_inyectores text check (ge_motor_detenido_calibre_inyectores in ('si', 'no')),

  -- Verificaciones de funcionamiento
  ge_funcionamiento_sistema_arranque text check (ge_funcionamiento_sistema_arranque in ('ok', 'mal')),
  ge_funcionamiento_mangueras text check (ge_funcionamiento_mangueras in ('ok', 'mal')),
  ge_funcionamiento_presion_aceite text check (ge_funcionamiento_presion_aceite in ('ok', 'bajo')),
  ge_funcionamiento_temp_agua text check (ge_funcionamiento_temp_agua in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_diferencial_temp text check (ge_funcionamiento_diferencial_temp in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_vibraciones text check (ge_funcionamiento_vibraciones in ('si', 'no')),
  ge_funcionamiento_antivibratorios text check (ge_funcionamiento_antivibratorios in ('ok', 'mal')),
  ge_funcionamiento_llave_termomagnetica text check (ge_funcionamiento_llave_termomagnetica in ('ok', 'mal')),
  ge_funcionamiento_carga_alternador text check (ge_funcionamiento_carga_alternador in ('si', 'no')),
  ge_funcionamiento_llave_transferencia text check (ge_funcionamiento_llave_transferencia in ('si', 'no')),
  ge_funcionamiento_rpm_max text check (ge_funcionamiento_rpm_max in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_circ_seguridad text check (ge_funcionamiento_circ_seguridad in ('ok', 'mal')),
  ge_funcionamiento_ventilacion_aire text check (ge_funcionamiento_ventilacion_aire in ('ok', 'mal')),
  ge_funcionamiento_perdidas_aceite text check (ge_funcionamiento_perdidas_aceite in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_perdidas_combustible text check (ge_funcionamiento_perdidas_combustible in ('si', 'no')),
  ge_funcionamiento_restriccion_escape text check (ge_funcionamiento_restriccion_escape in ('si', 'no')),
  ge_funcionamiento_restriccion_aire text check (ge_funcionamiento_restriccion_aire in ('si', 'no')),
  ge_funcionamiento_frecuencia text check (ge_funcionamiento_frecuencia in ('ok', 'baja', 'alta')),
  ge_funcionamiento_tension_linea text check (ge_funcionamiento_tension_linea in ('ok', 'baja', 'alta')),
  ge_funcionamiento_amperaje_f1 text check (ge_funcionamiento_amperaje_f1 in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_amperaje_f2 text check (ge_funcionamiento_amperaje_f2 in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_amperaje_f3 text check (ge_funcionamiento_amperaje_f3 in ('optimo', 'bajo', 'alto')),
  ge_funcionamiento_tension_linea_carga text check (ge_funcionamiento_tension_linea_carga in ('ok', 'baja', 'alta')),
  ge_funcionamiento_temp_ambiente numeric(10, 2),
  ge_funcionamiento_inspeccion_bateria text check (ge_funcionamiento_inspeccion_bateria in ('ok', 'no')),
  ge_funcionamiento_accion_electrico text check (ge_funcionamiento_accion_electrico in ('si', 'no'))
);

-- RLS para grupo_electrogeno
alter table informes_grupo_electrogeno enable row level security;

create policy ge_select on informes_grupo_electrogeno for select to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy ge_write on informes_grupo_electrogeno for insert to authenticated
  with check (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy ge_update on informes_grupo_electrogeno for update to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
create policy ge_delete on informes_grupo_electrogeno for delete to authenticated
  using (exists (select 1 from informes_generales g where g.id = informe_id and (g.tecnico_id = auth.uid() or public.es_admin())));
