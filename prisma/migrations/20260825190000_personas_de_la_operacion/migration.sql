-- Accesos pasa a ser el maestro de personas de la operacion.
--
-- Se aniade a la persona lo que hoy vive disperso: su codigo de vendedor (en la tabla
-- Seller de PEDIDO), si sigue en la organizacion, y quien la supervisa (hoy escrito a
-- mano en la configuracion de Analytics).
--
-- Todo NULABLE y con valor por defecto: esta migracion no puede tocar a los 9 usuarios
-- que ya existen ni interrumpir el login, que es de lo que depende entrar a todo.

ALTER TABLE "user" ADD COLUMN "codigoVendedor" TEXT;
ALTER TABLE "user" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user" ADD COLUMN "supervisorId" TEXT;

CREATE UNIQUE INDEX "user_codigoVendedor_key" ON "user"("codigoVendedor");
CREATE INDEX "user_codigoVendedor_idx" ON "user"("codigoVendedor");
CREATE INDEX "user_supervisorId_idx" ON "user"("supervisorId");

-- ON DELETE SET NULL: si se borra un supervisor, sus vendedores se quedan sin
-- supervisor, no desaparecen con el.
ALTER TABLE "user" ADD CONSTRAINT "user_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
