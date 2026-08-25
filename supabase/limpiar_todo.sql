delete from public.informe_archivos;
delete from public.informes_vehiculos;
delete from public.informes_compresor;
delete from public.informes_motocompresor;
delete from public.informes_generales;

alter sequence public.seq_numero_informe restart with 1;

-- Los archivos de Storage se borran desde el dashboard:
-- Storage → bucket "informe-archivos" → seleccionar todo → Delete
-- (Supabase bloquea el borrado directo por SQL para evitar datos huérfanos)
