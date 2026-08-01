-- Roles base (globales) para procovar-auth. Idempotente (ON CONFLICT (id)).
-- Son un PUNTO DE PARTIDA: se pueden editar/borrar (salvo super-admin) y crear más
-- desde la UI /roles. Reflejan los roles que ya usan las apps (Admin/Supervisor/Gestor/Usuario).
-- Correr:  psql "$DATABASE_URL" -f scripts/seed-roles.sql

INSERT INTO "role" (id, name, slug, description, "organizationId", permissions, "isSystem", "createdAt", "updatedAt") VALUES
  ('role_super_admin', 'Super Admin', 'super-admin', 'Acceso total a todo (comodín *).', NULL,
   ARRAY['*'], true, now(), now()),

  ('role_admin', 'Administrador', 'admin', 'Administra usuarios, roles y las apps.', NULL,
   ARRAY['users.read','users.create','users.update','roles.read','roles.manage','orgs.read','orgs.manage','audit.read',
         'pedido.orders.read','pedido.orders.write','pedido.import','pedido.reports',
         'delivery.orders.read','delivery.routes.manage','delivery.vehicles.manage','delivery.branches.manage','delivery.settings.manage',
         'analitics.view','analitics.export','analitics.config'], true, now(), now()),

  ('role_supervisor', 'Supervisor', 'supervisor', 'Ve todo y exporta; no configura.', NULL,
   ARRAY['users.read','roles.read','orgs.read','audit.read',
         'pedido.orders.read','pedido.reports',
         'delivery.orders.read',
         'analitics.view','analitics.export'], true, now(), now()),

  ('role_gestor', 'Gestor', 'gestor', 'Opera pedidos y ve su analítica.', NULL,
   ARRAY['pedido.orders.read','pedido.orders.write','delivery.orders.read','analitics.view'], true, now(), now()),

  ('role_usuario', 'Usuario', 'usuario', 'Acceso de solo lectura básico.', NULL,
   ARRAY['pedido.orders.read','analitics.view'], true, now(), now())
ON CONFLICT (id) DO NOTHING;
