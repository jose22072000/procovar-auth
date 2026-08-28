-- La tasa de cambio USD -> CUP, por sucursal y en Accesos.
--
-- Estaba sólo en PEDIDO. Delivery se apañaba con una tasa escrita a mano en su pantalla
-- de Configuración: dos números para lo mismo, y un domicilio que vale distinto según
-- dónde se mire. Eso no falla en pantalla — sale un importe creíble y cuadra mal en la
-- caja, que es donde se descubre tarde.
--
-- Vive aquí porque es un dato de la sucursal, y la sucursal es de Accesos. El valor lo
-- pone la API de Entrega, que ya la mantiene para su aplicación.
CREATE TABLE "TasaCambio" (
    "codigo"    TEXT NOT NULL,
    "cupPorUsd" DOUBLE PRECISION NOT NULL,
    "fuente"    TEXT,
    "traidoAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TasaCambio_pkey" PRIMARY KEY ("codigo")
);

CREATE INDEX "TasaCambio_traidoAt_idx" ON "TasaCambio"("traidoAt");
