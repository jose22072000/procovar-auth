-- Dos sucursales nuevas: Palma Soriano y Moa.
--
-- Van aquí y no a mano en la pantalla porque una sucursal no es solo una fila de
-- Accesos: de ella cuelga a qué sucursal pertenece cada persona, y las otras
-- aplicaciones —PEDIDO, Rutas, Analitics— resuelven la suya cruzando por este
-- identificador. Creándolas en la migración quedan puestas al desplegar, iguales en
-- todos los entornos y sin que dependa de que alguien se acuerde de pulsar un botón.
--
-- El `slug` sigue la misma regla que usa la pantalla al crearlas: sin tildes, en
-- minúsculas y con guiones. `updatedAt` no tiene valor por defecto en el esquema, así
-- que se pone a mano.
--
-- ON CONFLICT sobre el slug: si ya existieran —porque alguien las creó desde la
-- pantalla antes de que esto se desplegara—, no se duplican ni se pisa su nombre.
INSERT INTO "organization" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES
    (replace(gen_random_uuid()::text, '-', ''), 'Palma Soriano', 'palma-soriano', now(), now()),
    (replace(gen_random_uuid()::text, '-', ''), 'Moa',           'moa',           now(), now())
ON CONFLICT ("slug") DO NOTHING;
