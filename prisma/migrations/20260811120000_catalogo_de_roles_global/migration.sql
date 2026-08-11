-- El catálogo de roles pasa a ser ÚNICO para toda Procovar.
--
-- Venía colgado de la organización, y en Procovar la organización ES la
-- sucursal: eso obligaba a crear "OPERADOR" ocho veces y a cambiarlas todas a
-- mano cada vez que cambiara lo que puede hacer un operador. Lo que distingue a
-- una persona de otra no es el rol, es EN QUÉ SUCURSAL lo tiene, y eso ya lo
-- dice su fila de `member`.
--
-- De paso se va el alcance por PROPIEDAD, que venía del negocio de alojamientos
-- del que salió este código. En Procovar no hay propiedades.
--
-- Se puede aplicar sin más porque la base está vacía. Con datos habría que
-- decidir antes qué hacer con los roles repetidos entre sucursales.

-- role: fuera la organización, el nombre pasa a ser único en toda la instalación
ALTER TABLE "role" DROP CONSTRAINT IF EXISTS "role_organizationId_fkey";
DROP INDEX IF EXISTS "role_organizationId_name_key";
ALTER TABLE "role" DROP COLUMN IF EXISTS "organizationId";
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- member_role: el alcance sale del miembro, no se guarda aquí
ALTER TABLE "member_role" DROP COLUMN IF EXISTS "scopeAllProperties";
ALTER TABLE "member_role" DROP COLUMN IF EXISTS "propertyIds";

-- invitation: igual
ALTER TABLE "invitation" DROP COLUMN IF EXISTS "scopeAllProperties";
ALTER TABLE "invitation" DROP COLUMN IF EXISTS "propertyIds";
