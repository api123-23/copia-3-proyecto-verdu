-- Eliminar todos los datos de negocio (NO toca perfiles ni auth.users)

-- 1. Archivos de storage
delete from storage.objects where bucket_id = 'informe-archivos';

-- 2. Archivos/medios referenciados
delete from informe_archivos;

-- 3. Valores técnicos (tablas anexas)
delete from informes_grupo_electrogeno;
delete from informes_vehiculos;
delete from informes_compresor;
delete from informes_motocompresor;

-- 4. Informes
delete from informes_generales;

-- 5. Clientes
delete from clientes;

-- 6. Resetear secuencia de numeración
ALTER SEQUENCE seq_numero_informe RESTART WITH 1;
