-- =====================================================================
-- USO ÚNICO: deja solamente el informe Nº 14, lo renumera como Nº 1 y
-- reinicia la numeración para que el próximo informe sea el Nº 2.
--
-- ANTES DE EJECUTAR:
--   1. Ejecutar schema.sql completo (versión actualizada).
--   2. En todos los celulares, que no quede ningún informe en "Borrador",
--      "Subiendo…" o "Error de sync" de los informes que se van a borrar.
--
-- Todo corre en una sola transacción: si algo falla, no se modifica nada.
-- =====================================================================
begin;

-- Nadie puede crear ni numerar informes mientras corre el script.
lock table public.informes_generales in exclusive mode;
lock table public.numeracion_informes in exclusive mode;

do $$
begin
  if not exists (select 1 from public.informes_generales where numero_registro = 14) then
    raise exception 'No existe el informe Nº 14: no se modificó nada.';
  end if;
end $$;

-- Borra todos los demás informes (incluidos los que no tienen número).
-- Sus valores técnicos y registros de fotos/firmas se borran solos (cascade).
delete from public.informes_generales
where numero_registro is distinct from 14;

-- El informe 14 pasa a ser el 1.
update public.informes_generales
set numero_registro = 1
where numero_registro = 14;

-- El contador queda en 1: el próximo informe será el Nº 2.
update public.numeracion_informes set ultimo = 1 where id;
select setval('public.numero_informe_seq', 1, true);

commit;

-- Verificación (debe mostrar una sola fila con numero_registro = 1 y
-- proximo_numero = 2):
select
  (select count(*) from public.informes_generales) as informes,
  (select min(numero_registro) from public.informes_generales) as numero_registro,
  (select ultimo + 1 from public.numeracion_informes where id) as proximo_numero;
