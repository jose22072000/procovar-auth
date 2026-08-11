-- Fuera lo que era del negocio de alojamientos.
--
-- Todo esto llegó con el código del que salió esta aplicación y aquí no
-- significa nada:
--
--   · `plan` y `subscription`: planes de pago. Procovar no le cobra una
--     suscripción a su propia gente.
--   · `tenant_domain`: los dominios propios que cada propietario registraba para
--     recibir la vuelta del login. Aquí las aplicaciones son cuatro y sus
--     destinos están en `client_app`. Además, una lista de dominios de terceros
--     en el camino de vuelta del login es una puerta de más justo donde no
--     conviene tenerla.
--   · `user.nationality`, `user.address`, `user.passportId`: datos de huésped.
--     A una operadora de Camagüey no se le piden para facturar, y guardarlos
--     sería quedarse con información personal que aquí no hace falta.
--
-- Se comprobó antes de escribir esto: 0 suscripciones, 0 planes, 0 dominios y
-- 0 personas con datos de huésped. No se pierde nada.

DROP TABLE IF EXISTS "subscription";
DROP TABLE IF EXISTS "plan";
DROP TABLE IF EXISTS "tenant_domain";

DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "BillingCycle";

ALTER TABLE "user" DROP COLUMN IF EXISTS "nationality";
ALTER TABLE "user" DROP COLUMN IF EXISTS "address";
ALTER TABLE "user" DROP COLUMN IF EXISTS "passportId";
