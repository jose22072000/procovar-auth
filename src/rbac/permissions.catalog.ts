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
 * person run reports in Analitics but not in PEDIDO — two keys, not one flag
 * reused.
 *
 * # Sobre el tamaño de esta lista
 *
 * Es larga a propósito. Empezó con treinta claves y se quedaba corta enseguida:
 * un permiso que no existe no es un permiso abierto, es una pared con la que
 * choca alguien un martes por la mañana sin que nadie sepa por qué. Vale más
 * declarar de más —una clave que nadie comprueba todavía no hace daño— que
 * descubrir el hueco cuando una operadora no puede trabajar.
 *
 * A key is `resource.action`, exactly two parts: they are split back out of it
 * and stored as columns.
 *
 * Añadir es seguro y es la forma normal de crecer. QUITAR una clave borra el
 * permiso y deja huérfanas las concesiones que apuntaban a él —la sincronización
 * las limpia—, así que quitar es quitarle el acceso a alguien en silencio. Si la
 * clave sigue nombrada en algún sitio, márcala `isDeprecated` en vez de borrarla.
 */
const e = (
  key: string, group: string, service: string, es: string, en: string,
): PermissionEntry => {
  const [resource, action] = key.split('.')
  return { key, resource, action, service, group, label: { es, en } }
}

export const PERMISSION_CATALOG: PermissionEntry[] = [
  // ══ PEDIDO ═══════════════════════════════════════════════════════════════
  e('pedido.read',     'Pedidos', 'pedido', 'Ver los pedidos', 'View orders'),
  e('pedido.complete', 'Pedidos', 'pedido', 'Completar pedidos', 'Complete orders'),
  e('pedido.edit',     'Pedidos', 'pedido', 'Editar un pedido', 'Edit an order'),
  e('pedido.delete',   'Pedidos', 'pedido', 'Eliminar pedidos', 'Delete orders'),
  e('pedido.import',   'Pedidos', 'pedido', 'Importar pedidos (CSV)', 'Import orders (CSV)'),
  e('pedido.export',   'Pedidos', 'pedido', 'Exportar la lista de pedidos', 'Export the order list'),
  e('pedido.copy',     'Pedidos', 'pedido', 'Copiar al portapapeles para facturar', 'Copy to clipboard for billing'),

  e('cliente.read',   'Clientes', 'pedido', 'Ver los clientes', 'View clients'),
  e('cliente.create', 'Clientes', 'pedido', 'Crear clientes', 'Create clients'),
  e('cliente.edit',   'Clientes', 'pedido', 'Editar clientes', 'Edit clients'),
  e('cliente.delete', 'Clientes', 'pedido', 'Eliminar clientes', 'Delete clients'),
  e('cliente.export', 'Clientes', 'pedido', 'Exportar clientes', 'Export clients'),

  e('vendedor.read',   'Vendedores', 'pedido', 'Ver los vendedores', 'View sellers'),
  e('vendedor.create', 'Vendedores', 'pedido', 'Dar de alta vendedores', 'Create sellers'),
  e('vendedor.edit',   'Vendedores', 'pedido', 'Editar vendedores', 'Edit sellers'),
  e('vendedor.manage', 'Vendedores', 'pedido', 'Dar de baja y asignar gestor', 'Deactivate and assign manager'),

  e('reporte.read',   'Informes', 'pedido', 'Ver los informes', 'View reports'),
  e('reporte.export', 'Informes', 'pedido', 'Exportar informes', 'Export reports'),
  e('panel.read',     'Informes', 'pedido', 'Ver el panel de PEDIDO', 'View the PEDIDO dashboard'),

  e('comision.read',   'Comisiones', 'pedido', 'Ver las comisiones', 'View commissions'),
  e('comision.manage', 'Comisiones', 'pedido', 'Configurar las comisiones', 'Configure commissions'),

  e('usuariopedido.read',   'Usuarios de PEDIDO', 'pedido', 'Ver los usuarios de PEDIDO', 'View PEDIDO users'),
  e('usuariopedido.manage', 'Usuarios de PEDIDO', 'pedido', 'Crear y editar usuarios de PEDIDO', 'Manage PEDIDO users'),

  e('integracion.read',   'Integraciones', 'pedido', 'Ver claves de API y avisos web', 'View API keys and webhooks'),
  e('integracion.manage', 'Integraciones', 'pedido', 'Gestionar claves de API y avisos web', 'Manage API keys and webhooks'),
  e('sincronizacion.run', 'Integraciones', 'pedido', 'Lanzar la sincronización con Parranda', 'Run the Parranda sync'),

  // ══ Analitics ════════════════════════════════════════════════════════════
  e('analitics.read',    'Analítica', 'analitics', 'Ver la analítica', 'View analytics'),
  e('analitics.export',  'Analítica', 'analitics', 'Exportar la analítica', 'Export analytics'),
  e('analitics.gestor',  'Analítica', 'analitics', 'Ver el desglose por gestor', 'View the breakdown by manager'),
  e('analitics.producto', 'Analítica', 'analitics', 'Ver el desglose por producto', 'View the breakdown by product'),
  e('analitics.meta',    'Analítica', 'analitics', 'Ver y fijar metas', 'View and set targets'),
  e('analitics.admin',   'Analítica', 'analitics', 'Configurar la analítica', 'Configure analytics'),

  // ══ Delivery ═════════════════════════════════════════════════════════════
  e('reparto.read',     'Reparto', 'delivery', 'Ver los repartos', 'View deliveries'),
  e('reparto.assign',   'Reparto', 'delivery', 'Asignar repartos', 'Assign deliveries'),
  e('reparto.complete', 'Reparto', 'delivery', 'Cerrar un reparto', 'Close a delivery'),
  e('ruta.read',        'Rutas', 'delivery', 'Ver las rutas', 'View routes'),
  e('ruta.manage',      'Rutas', 'delivery', 'Crear y calcular rutas', 'Create and compute routes'),
  e('vehiculo.read',    'Vehículos', 'delivery', 'Ver los vehículos', 'View vehicles'),
  e('vehiculo.manage',  'Vehículos', 'delivery', 'Gestionar los vehículos', 'Manage vehicles'),
  e('almacen.read',     'Almacén', 'delivery', 'Ver productos y orígenes', 'View products and origins'),
  e('almacen.manage',   'Almacén', 'delivery', 'Gestionar productos y orígenes', 'Manage products and origins'),
  e('reparto.report',   'Reparto', 'delivery', 'Ver los informes de reparto', 'View delivery reports'),
  e('reparto.sync',     'Reparto', 'delivery', 'Lanzar la sincronización', 'Run the sync'),

  // ══ Tablero Parranda ═════════════════════════════════════════════════════
  e('ccsa.read',       'Parranda', 'ccsa', 'Ver el tablero', 'View the dashboard'),
  e('ccsa.export',     'Parranda', 'ccsa', 'Exportar del tablero', 'Export from the dashboard'),
  e('ccsa.territorio', 'Parranda', 'ccsa', 'Elegir el territorio que se mira', 'Choose which territory to view'),
  e('ccsa.admin',      'Parranda', 'ccsa', 'Configurar el tablero', 'Configure the dashboard'),

  // ══ Accesos (esta misma aplicación) ══════════════════════════════════════
  e('member.read',       'Personas', 'auth', 'Ver las personas de la sucursal', 'View members'),
  e('member.invite',     'Personas', 'auth', 'Dar de alta personas', 'Add people'),
  e('member.remove',     'Personas', 'auth', 'Dar de baja personas', 'Remove people'),
  e('member.assignRole', 'Personas', 'auth', 'Asignar roles a las personas', 'Assign roles'),
  e('member.password',   'Personas', 'auth', 'Cambiarle la contraseña a alguien', "Change someone's password"),
  e('member.session',    'Personas', 'auth', 'Cerrarle la sesión a alguien', "Close someone's session"),

  e('role.read',   'Roles y permisos', 'auth', 'Ver los roles', 'View roles'),
  e('role.create', 'Roles y permisos', 'auth', 'Crear roles', 'Create roles'),
  e('role.edit',   'Roles y permisos', 'auth', 'Editar los permisos de un rol', "Edit a role's permissions"),
  e('role.delete', 'Roles y permisos', 'auth', 'Eliminar roles', 'Delete roles'),

  e('organization.read',   'Sucursales', 'auth', 'Ver las sucursales', 'View sucursales'),
  e('organization.edit',   'Sucursales', 'auth', 'Editar una sucursal', 'Edit a sucursal'),
  e('organization.create', 'Sucursales', 'auth', 'Crear sucursales', 'Create sucursales'),
  e('organization.delete', 'Sucursales', 'auth', 'Eliminar sucursales', 'Delete sucursales'),

  // Quién entró, qué tocó y desde dónde. Sin esto no se puede responder qué
  // pasó con un pedido cuando alguien lo niega.
  e('audit.read',   'Auditoría', 'auth', 'Ver la auditoría', 'View the audit log'),
  e('audit.export', 'Auditoría', 'auth', 'Exportar la auditoría', 'Export the audit log'),

  e('app.read',   'Aplicaciones', 'auth', 'Ver las aplicaciones registradas', 'View registered applications'),
  e('app.manage', 'Aplicaciones', 'auth', 'Registrar y configurar aplicaciones', 'Register and configure applications'),
]
