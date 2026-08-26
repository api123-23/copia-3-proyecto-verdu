-- Eliminar todos los datos de negocio (NO toca perfiles ni auth.users)
-- Ejecutar en Supabase SQL Editor

-- 1. Referencias de archivos
DELETE FROM informe_archivos;

-- 2. Valores técnicos (tablas anexas)
DELETE FROM informes_grupo_electrogeno;
DELETE FROM informes_vehiculos;
DELETE FROM informes_compresor;
DELETE FROM informes_motocompresor;

-- 3. Informes
DELETE FROM informes_generales;

-- 4. Clientes
DELETE FROM clientes;

-- 5. Resetear secuencia de numeración
ALTER SEQUENCE seq_numero_informe RESTART WITH 1;
