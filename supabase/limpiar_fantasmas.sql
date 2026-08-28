-- Eliminar informes fantasma: registros en informes_generales sin valores técnicos,
-- sin fotos ni firmas (generados por bugs anteriores). Ejecutar en Supabase SQL Editor.
-- OPCIONAL: borra la última línea si querés conservar informes sin carga.

delete from informe_archivos a
using informes_generales g
where a.informe_id = g.id
  and not exists (
    select 1 from (
      select informe_id from informes_motocompresor
      union all select informe_id from informes_compresor
      union all select informe_id from informes_vehiculos
      union all select informe_id from informes_grupo_electrogeno
    ) v where v.informe_id = g.id
  )
  and (
    (g.tipo_equipo <> 'extraordinarios')
    or (g.aclaracion_firma is null and g.observaciones is null and g.horas_trabajadas is null)
  );

delete from informes_generales g
where not exists (
    select 1 from (
      select informe_id from informes_motocompresor
      union all select informe_id from informes_compresor
      union all select informe_id from informes_vehiculos
      union all select informe_id from informes_grupo_electrogeno
    ) v where v.informe_id = g.id
  )
  and not exists (select 1 from informe_archivos a where a.informe_id = g.id)
  and (
    (g.tipo_equipo <> 'extraordinarios')
    or (g.aclaracion_firma is null and g.observaciones is null and g.horas_trabajadas is null)
  );