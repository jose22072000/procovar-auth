-- Nombre de usuario, para poder entrar sin correo.
--
-- En PEDIDO la gente entra con `yasmani`, `claudia.hab`, `rene`… y muchos no
-- tienen dirección de correo. Sin esto, traerlos aquí les obligaría a
-- identificarse de una forma que no reconocen.
--
-- Es opcional: quien entre con correo no necesita ninguno. Y único, para que dos
-- personas no puedan reclamar el mismo nombre.
ALTER TABLE "user" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
