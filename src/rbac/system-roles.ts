import { PERMISSION_CATALOG } from './permissions.catalog'

/**
 * The six Procovar roles. One catalog for all eight sucursales.
 *
 * The names are spelled EXACTLY as PEDIDO already spells them, because PEDIDO
 * compares the role it receives against these strings. Renaming one here to
 * something tidier (`super-admin`) would mean adding a translation table in
 * every app, and a translation table is one more thing that can disagree.
 *
 * What each role may do is only SEEDED here. Once it is in the database it is
 * edited from the permissions screen — Jose asked to manage permissions without
 * touching code. So treat this file as the starting point, not the law: a
 * deployment must never overwrite what somebody changed on screen (see
 * `syncRbac`, which only ADDS what is missing from a role it just created).
 */
export const SYSTEM_ROLE_NAMES = ['SUPER ADMIN', 'ADMINISTRADOR', 'GERENTE', 'SUPERVISOR', 'GESTOR', 'OPERADOR'] as const
export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number]

/** The role a new member gets when nobody said otherwise: the most limited one. */
export const ROL_MINIMO: SystemRoleName = 'GESTOR'

/**
 * Which role wins when a person holds several, for the single `member.role`
 * string better-auth keeps. Most powerful first.
 */
export const PRECEDENCE: readonly string[] = SYSTEM_ROLE_NAMES

export const ROLE_DESCRIPTIONS: Record<SystemRoleName, string> = {
  'SUPER ADMIN': 'Global. Ve y gestiona todas las sucursales.',
  ADMINISTRADOR: 'Gestiona las sucursales a las que pertenece, y solo esas.',
  GERENTE: 'Ve todo lo de su sucursal y lleva el día a día, pero no reparte accesos ni toca la configuración.',
  SUPERVISOR: 'Ve lo suyo y lo de sus gestores dentro de su sucursal, y puede actuar.',
  GESTOR: 'Solo sus propios datos: sus vendedores, sus pedidos, sus clientes.',
  OPERADOR: 'El facturador. Lee y completa los pedidos de su sucursal. Sin informes.',
}

const allKeys = () => PERMISSION_CATALOG.filter((p) => !p.isDeprecated).map((p) => p.key)

/** Lo mínimo para trabajar: leer lo suyo. */
const GESTOR_KEYS = [
  'pedido.read',
  'pedido.copy',
  'panel.read',
  'cliente.read',
  'vendedor.read',
  'comision.read',
  'reparto.read',
]

/**
 * El Operador factura: lee los pedidos de su sucursal, los completa y copia los
 * datos al sistema de facturación. Y nada más.
 *
 * Sin informes en NINGUNA aplicación y sin importar: "no, reportes no, pedidos
 * nada más, como está hasta ahora está correcto" (Jose, 11/08). Es exactamente
 * lo que hace hoy en PEDIDO, así que conectar PEDIDO a este login no le cambia
 * el día a día a ninguna operadora.
 */
const OPERADOR_KEYS = [
  ...GESTOR_KEYS,
  'pedido.complete',
  'pedido.edit',
  'pedido.export',
  'cliente.create',
  'cliente.edit',
  'cliente.export',
]

/**
 * El Supervisor saca adelante el trabajo de la sucursal: importa, saca
 * informes, lleva a los vendedores y mueve el reparto. Lo que NO hace es
 * repartir accesos — para eso está el Administrador.
 */
const SUPERVISOR_KEYS = [
  ...OPERADOR_KEYS,
  'pedido.import',
  'reporte.read',
  'reporte.export',
  'vendedor.create',
  'vendedor.edit',
  'vendedor.manage',
  'analitics.read',
  'analitics.export',
  'analitics.gestor',
  'analitics.producto',
  'analitics.meta',
  'reparto.assign',
  'reparto.complete',
  'reparto.report',
  'ruta.read',
  'ruta.manage',
  'vehiculo.read',
  'almacen.read',
  'ccsa.read',
  'ccsa.export',
  'ccsa.territorio',
  'member.read',
  'usuariopedido.read',
  'integracion.read',
  'sincronizacion.run',
]

/**
 * El Administrador manda en SU sucursal: todo lo que se hace ahí dentro,
 * incluido dar de alta gente, ponerle rol y mirar la auditoría.
 *
 * Se le quedan fuera las cosas que son de TODA la empresa, no de una sucursal:
 * el catálogo de roles (tocar "OPERADOR" lo cambia en las ocho), el alta de
 * aplicaciones, y crear o borrar sucursales.
 */
const ADMIN_EXCLUIDOS_BASE = [
  'app.manage',
  'role.create',
  'role.edit',
  'role.delete',
  'organization.create',
  'organization.delete',
] as const

const ADMIN_EXCLUIDOS = new Set<string>(ADMIN_EXCLUIDOS_BASE)

/**
 * El Gerente está por encima del Supervisor y por debajo del Administrador: ve
 * TODO lo de su sucursal, no solo lo de un equipo, y lleva el trabajo diario.
 *
 * Lo que se le quita respecto al Administrador es lo que reparte poder o cambia
 * cómo funciona el sistema: dar de alta gente y ponerle rol, la auditoría, las
 * integraciones y la configuración. "Como un admin pero sin las cosas
 * complejas, solo gestionar cosas sencillas" (Jose, 15/08).
 */
const GERENTE_EXCLUIDOS = new Set<string>([
  ...ADMIN_EXCLUIDOS_BASE,
  // Repartir accesos es del Administrador.
  'member.invite',
  'member.remove',
  'member.password',
  'member.session',
  // Y la trastienda: auditoría, integraciones y tocar la sucursal.
  'audit.read',
  'audit.export',
  'integracion.manage',
  'organization.edit',
  'usuariopedido.manage',
])

export function systemRolePermissionKeys(role: string): string[] {
  switch (role) {
    case 'SUPER ADMIN': return allKeys()
    case 'ADMINISTRADOR': return allKeys().filter((k) => !ADMIN_EXCLUIDOS.has(k))
    case 'GERENTE': return allKeys().filter((k) => !GERENTE_EXCLUIDOS.has(k))
    case 'SUPERVISOR': return [...new Set(SUPERVISOR_KEYS)]
    case 'OPERADOR': return [...new Set(OPERADOR_KEYS)]
    case 'GESTOR': return [...GESTOR_KEYS]
    default: return []
  }
}
