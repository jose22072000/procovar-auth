-- La tarifa base de cada sucursal (CUP por km y por kg), tal como la da Entrega.
-- Es el otro número con el que se cobra un domicilio: importe = tarifa × distancia × peso.
ALTER TABLE "TasaCambio" ADD COLUMN IF NOT EXISTS "tarifaBase" DOUBLE PRECISION;
