-- La puerta de entrada por token, para la APK de reparto.
--
-- Auth ya sabía dos formas de identificar: la cookie del login por redirección y la
-- firma HMAC entre servidores. Una APK no puede usar ninguna de las dos —se
-- descompila, así que no puede llevar una clave dentro—, así que manda usuario y
-- contraseña por HTTPS y recibe un par de tokens.
--
-- Esta tabla guarda el REFRESH, que es el que de verdad hay que poder quitar: el de
-- acceso dura 15 minutos y no se revoca, vale hasta que caduca.
--
-- Una fila usada NO se borra. Se marca (`usedAt`) y se conserva, porque su trabajo
-- más importante llega después: si ese mismo token vuelve a presentarse, es que
-- alguien tiene una copia, y ahí se cierran TODAS las sesiones de esa cuenta.
CREATE TABLE "refresh_token" (
    "id"         TEXT NOT NULL,
    "tokenHash"  TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "sessionId"  TEXT,
    "familyId"   TEXT NOT NULL,
    "clientId"   TEXT,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "usedAt"     TIMESTAMP(3),
    "revokedAt"  TIMESTAMP(3),
    "replacedBy" TEXT,
    "ip"         TEXT,
    "userAgent"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- Único de verdad, y no sólo un índice: es lo que hace que dos renovaciones a la vez
-- con el mismo token no puedan salir las dos adelante.
CREATE UNIQUE INDEX "refresh_token_tokenHash_key" ON "refresh_token"("tokenHash");
CREATE INDEX "refresh_token_userId_idx" ON "refresh_token"("userId");
CREATE INDEX "refresh_token_familyId_idx" ON "refresh_token"("familyId");
-- Para la limpieza de lo caducado, que si no hay que hacerla recorriendo la tabla.
CREATE INDEX "refresh_token_expiresAt_idx" ON "refresh_token"("expiresAt");

ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
