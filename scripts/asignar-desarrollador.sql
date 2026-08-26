-- Poner a alguien el rol DESARROLLADOR.
--
-- CUANDO: DESPUES de desplegar auth. El rol no existe en la base hasta que
-- `syncRbac` corre al arrancar (src/instrumentation.ts) y lo crea a partir de
-- SYSTEM_ROLE_NAMES. Si se corre antes, no encuentra el rol y no hace nada.
--
-- COMO:
--   docker exec -i $(docker ps -qf name=procovar-postgres) \
--     psql -U procovar -d procovar_auth < scripts/asignar-desarrollador.sql
--
-- Idempotente: correrlo dos veces deja lo mismo.

\set correo 'josework2207@gmail.com'

DO $$
DECLARE
  rol_id text;
  n int;
BEGIN
  SELECT id INTO rol_id FROM "role" WHERE name = 'DESARROLLADOR';

  IF rol_id IS NULL THEN
    RAISE EXCEPTION 'El rol DESARROLLADOR no existe todavia. Despliega auth primero: syncRbac lo crea al arrancar.';
  END IF;

  UPDATE "user" SET "defaultRoleId" = rol_id
   WHERE email = 'josework2207@gmail.com';
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n = 0 THEN
    RAISE EXCEPTION 'No hay ningun usuario con ese correo.';
  END IF;

  RAISE NOTICE 'Listo: % cuenta(s) con rol DESARROLLADOR.', n;
END $$;

-- Comprobacion.
SELECT u.email, r.name AS rol, u."isSystemAdmin"
  FROM "user" u JOIN "role" r ON r.id = u."defaultRoleId"
 WHERE u.email = 'josework2207@gmail.com';
