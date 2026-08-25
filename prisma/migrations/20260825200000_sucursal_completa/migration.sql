-- La sucursal, con todo lo que lleva, en un solo sitio.
--
-- Hoy los datos de una sucursal estan repartidos: el codigo en PEDIDO, las coordenadas
-- y el almacen en delivery, la zona horaria y si esta activa en Rutas, y las metas en
-- Analytics. Nadie es la fuente: cada uno guarda su trozo y ninguno tiene el conjunto.
--
-- Esto trae a Accesos lo que es un HECHO de la sucursal —donde esta, cual es su
-- almacen, como se llama en los demas sistemas— y deja en cada aplicacion lo que es
-- ajuste suyo: las jornadas y radios de parada de Rutas, las metas de Analytics, los
-- vehiculos de delivery. Identidad aqui, operacion alli.
--
-- Todo nulable: no puede romper el login ni las 10 sucursales que ya existen.

ALTER TABLE "organization" ADD COLUMN "codigo" TEXT;
ALTER TABLE "organization" ADD COLUMN "activa" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organization" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Havana';
ALTER TABLE "organization" ADD COLUMN "telefono" TEXT;
ALTER TABLE "organization" ADD COLUMN "direccion" TEXT;
ALTER TABLE "organization" ADD COLUMN "latitud" DOUBLE PRECISION;
ALTER TABLE "organization" ADD COLUMN "longitud" DOUBLE PRECISION;
ALTER TABLE "organization" ADD COLUMN "almacenNombre" TEXT;
ALTER TABLE "organization" ADD COLUMN "almacenDireccion" TEXT;
ALTER TABLE "organization" ADD COLUMN "almacenLatitud" DOUBLE PRECISION;
ALTER TABLE "organization" ADD COLUMN "almacenLongitud" DOUBLE PRECISION;

CREATE UNIQUE INDEX "organization_codigo_key" ON "organization"("codigo");
CREATE INDEX "organization_codigo_idx" ON "organization"("codigo");

-- El codigo se rellena del slug, que ya lo lleva: cam -> CAM, palma-soriano -> PLS.
-- Los dos ultimos no existen en delivery ni en el consolidado, asi que su codigo se
-- deja como el slug en mayusculas y se corrige a mano si hiciera falta.
UPDATE "organization" SET "codigo" = upper(slug) WHERE slug NOT LIKE '%-%';
