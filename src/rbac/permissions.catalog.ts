import type { PermissionEntry } from './types'

/**
 * Everything a person can be allowed to do, across every Procovar app.
 *
 * One list, on purpose. Today each app decides for itself who may do what, so
 * "the Operador cannot run reports" lives in PEDIDO's code, "this user only sees
 * Las Tunas" lives in the Parranda dashboard, and nobody can answer "what can
 * Yasmani do?" without reading four codebases. Here the answer is one query.
 *
 * `service` says which app a permission belongs to. It is what lets the same
 * person be an Operador who runs reports in analitics but not in PEDIDO — the
 * two are different keys, not one flag reused.
 *
 * A key is `resource.action`, exactly two parts: `resource` and `action` are
 * split back out of it and stored as columns.
 *
 * Adding to this list is safe and is the normal way to grow: the sync upserts
 * new entries and roles pick them up. REMOVING a key deletes the permission row
 * and orphans the grants pointing at it — the sync prunes them, so a removal
 * silently takes access away. Deprecate with `isDeprecated` instead when the
 * key is still referenced anywhere.
 */
const e = (
  key: string, group: string, service: string, es: string, en: string,
): PermissionEntry => {
  const [resource, action] = key.split('.')
  return { key, resource, action, service, group, label: { es, en } }
}

export const PERMISSION_CATALOG: PermissionEntry[] = [
  // ── PEDIDO ────────────────────────────────────────────────────────────────
  e('pedido.read',      'Pedidos', 'pedido', 'Ver pedidos', 'View orders'),
  e('pedido.complete',  'Pedidos', 'pedido', 'Completar pedidos', 'Complete orders'),
  e('pedido.delete',    'Pedidos', 'pedido', 'Eliminar pedidos', 'Delete orders'),
  e('pedido.import',    'Pedidos', 'pedido', 'Importar pedidos (CSV)', 'Import orders (CSV)'),
  e('cliente.read',     'Clientes', 'pedido', 'Ver clientes', 'View clients'),
  e('cliente.edit',     'Clientes', 'pedido', 'Editar clientes', 'Edit clients'),
  e('vendedor.read',    'Vendedores', 'pedido', 'Ver vendedores', 'View sellers'),
  e('vendedor.manage',  'Vendedores', 'pedido', 'Alta, baja y gestor de vendedores', 'Manage sellers'),
  e('reporte.read',     'Informes', 'pedido', 'Ver informes de PEDIDO', 'View PEDIDO reports'),
  e('comision.read',    'Comisiones', 'pedido', 'Ver comisiones', 'View commissions'),
  e('comision.manage',  'Comisiones', 'pedido', 'Configurar comisiones', 'Configure commissions'),

  // ── analitics ─────────────────────────────────────────────────────────────
  e('analitics.read',   'Analítica', 'analitics', 'Ver la analítica', 'View analytics'),
  e('analitics.export', 'Analítica', 'analitics', 'Exportar la analítica', 'Export analytics'),

  // ── delivery ──────────────────────────────────────────────────────────────
  e('reparto.read',   'Reparto', 'delivery', 'Ver los repartos', 'View deliveries'),
  e('reparto.assign', 'Reparto', 'delivery', 'Asignar repartos', 'Assign deliveries'),
  e('reparto.manage', 'Reparto', 'delivery', 'Gestionar el reparto', 'Manage delivery'),

  // ── ccsa (tablero Parranda) ───────────────────────────────────────────────
  e('ccsa.read',   'Parranda', 'ccsa', 'Ver el tablero de Parranda', 'View the Parranda dashboard'),
  e('ccsa.export', 'Parranda', 'ccsa', 'Exportar del tablero', 'Export from the dashboard'),

  // ── auth: personas y accesos ──────────────────────────────────────────────
  e('member.read',       'Personas', 'auth', 'Ver las personas de la sucursal', 'View members'),
  e('member.invite',     'Personas', 'auth', 'Dar de alta / invitar personas', 'Invite members'),
  e('member.remove',     'Personas', 'auth', 'Dar de baja personas', 'Remove members'),
  e('member.assignRole', 'Personas', 'auth', 'Asignar roles a las personas', 'Assign roles'),

  e('role.read',   'Roles y permisos', 'auth', 'Ver los roles', 'View roles'),
  e('role.create', 'Roles y permisos', 'auth', 'Crear roles', 'Create roles'),
  e('role.edit',   'Roles y permisos', 'auth', 'Editar los permisos de un rol', "Edit a role's permissions"),
  e('role.delete', 'Roles y permisos', 'auth', 'Eliminar roles', 'Delete roles'),

  e('organization.read', 'Sucursales', 'auth', 'Ver las sucursales', 'View sucursales'),
  e('organization.edit', 'Sucursales', 'auth', 'Editar las sucursales', 'Edit sucursales'),

  // Quién entró, qué tocó y desde dónde. Jose lo pidió aparte: sin esto no se
  // puede responder qué pasó con un pedido cuando alguien lo niega.
  e('audit.read', 'Auditoría', 'auth', 'Ver la auditoría', 'View the audit log'),

  // Dar de alta las aplicaciones que usan este login.
  e('app.manage', 'Aplicaciones', 'auth', 'Registrar aplicaciones', 'Register applications'),
]
