-- Los almacenes pasan a tabla propia: una sucursal puede tener varios.
--
-- Estaban como cuatro campos dentro de Organization (almacenNombre, almacenLatitud…),
-- dando por hecho que cada sucursal tiene uno. No es cierto, y con un solo juego de
-- campos el segundo no cabe: quien lo necesitara acabaría metiéndolo en la dirección
-- del primero.
CREATE TABLE "Almacen" (
    "id"        TEXT NOT NULL,
    "orgId"     TEXT NOT NULL,
    "nombre"    TEXT NOT NULL,
    "direccion" TEXT,
    "latitud"   DOUBLE PRECISION,
    "longitud"  DOUBLE PRECISION,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "activo"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Almacen_orgId_idx" ON "Almacen"("orgId");
CREATE INDEX "Almacen_orgId_principal_idx" ON "Almacen"("orgId", "principal");

ALTER TABLE "Almacen" ADD CONSTRAINT "Almacen_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Lo que ya estaba cargado se conserva, marcado como principal. Sin este paso, quitar
-- las columnas borraría en silencio la ubicación con la que se cobra el domicilio.
INSERT INTO "Almacen" ("id", "orgId", "nombre", "direccion", "latitud", "longitud", "principal", "activo", "createdAt", "updatedAt")
SELECT
    md5(random()::text || clock_timestamp()::text),
    o."id",
    COALESCE(NULLIF(o."almacenNombre", ''), o."name"),
    o."almacenDireccion",
    o."almacenLatitud",
    o."almacenLongitud",
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "organization" o
WHERE o."almacenNombre" IS NOT NULL
   OR o."almacenLatitud" IS NOT NULL
   OR o."almacenLongitud" IS NOT NULL;

ALTER TABLE "organization" DROP COLUMN "almacenNombre";
ALTER TABLE "organization" DROP COLUMN "almacenDireccion";
ALTER TABLE "organization" DROP COLUMN "almacenLatitud";
ALTER TABLE "organization" DROP COLUMN "almacenLongitud";
