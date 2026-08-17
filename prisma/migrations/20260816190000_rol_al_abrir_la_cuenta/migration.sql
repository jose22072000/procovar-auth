-- El rol se guarda en la PERSONA, no solo en sus membresías.
--
-- La cuenta se abre sin sucursal, y hasta ahora el rol solo existía dentro de la
-- membresía: quien no estaba en ninguna sucursal no tenía rol en ninguna parte. Al
-- ir a meterlo en su primera sucursal, la pantalla decía "esa persona no tiene rol
-- todavía" —y sí lo tenía, se lo habían puesto al crearla; no había dónde guardarlo.
--
-- ON DELETE SET NULL y no CASCADE: borrar un rol del catálogo no puede llevarse por
-- delante a la gente que lo tenía.
ALTER TABLE "user" ADD COLUMN "defaultRoleId" TEXT;

ALTER TABLE "user"
  ADD CONSTRAINT "user_defaultRoleId_fkey"
  FOREIGN KEY ("defaultRoleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A quien ya tiene cuenta se le rellena con el rol que ya lleva en su sucursal más
-- reciente: es el mismo que se heredaba antes, solo que ahora queda escrito.
UPDATE "user" u
SET "defaultRoleId" = (
    SELECT mr."roleId"
    FROM "member_role" mr
    JOIN "member" m ON m.id = mr."memberId"
    WHERE m."userId" = u.id
    ORDER BY m."createdAt" DESC
    LIMIT 1
)
WHERE u."defaultRoleId" IS NULL;
