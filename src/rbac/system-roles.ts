import { PERMISSION_CATALOG } from './permissions.catalog'

/**
 * The five Procovar roles. One catalog for all eight sucursales.
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
export const SYSTEM_ROLE_NAMES = ['SUPER ADMIN', 'ADMINISTRADOR', 'SUPERVISOR', 'GESTOR', 'OPERADOR'] as const
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
  SUPERVISOR: 'Ve lo suyo y lo de sus gestores dentro de su sucursal, y puede actuar.',
  GESTOR: 'Solo sus propios datos: sus vendedores, sus pedidos, sus clientes.',
  OPERADOR: 'El facturador. Lee los datos de su sucursal y consulta la analítica.',
}

const allKeys = () => PERMISSION_CATALOG.filter((p) => !p.isDeprecated).map((p) => p.key)

/** Lo mínimo: leer lo que hace falta para trabajar. */
const GESTOR_KEYS = [
  'pedido.read',
  'cliente.read',
  'vendedor.read',
  'comision.read',
  'reparto.read',
]

/**
 * El Operador factura: lee los pedidos de su sucursal, los completa y copia los
 * datos al sistema de facturación.
 *
 * NO lleva `pedido.import` ni `reporte.read` a propósito — subir un CSV
 * equivocado no es cosa suya, y así está funcionando hoy en PEDIDO. Sí lleva
 * `analitics.read`: Jose lo llamó "el facturador analítico, que puede revisar
 * reportes y ver datos", y esos reportes son los de analitics.
 */
const OPERADOR_KEYS = [
  ...GESTOR_KEYS,
  'pedido.complete',
  'cliente.edit',
  'analitics.read',
  'ccsa.read',
]

/** El Supervisor hace el trabajo de la sucursal, menos tocar accesos. */
const SUPERVISOR_KEYS = [
  ...OPERADOR_KEYS,
  'pedido.import',
  'reporte.read',
  'vendedor.manage',
  'analitics.export',
  'reparto.assign',
  'member.read',
]

/**
 * El Administrador manda en SU sucursal: todo menos lo que es de toda la
 * empresa. Registrar aplicaciones y borrar roles del catálogo afectan a las
 * ocho sucursales a la vez, así que se quedan para el Super Admin.
 */
const ADMIN_EXCLUIDOS = new Set(['app.manage', 'role.delete'])

export function systemRolePermissionKeys(role: string): string[] {
  switch (role) {
    case 'SUPER ADMIN': return allKeys()
    case 'ADMINISTRADOR': return allKeys().filter((k) => !ADMIN_EXCLUIDOS.has(k))
    case 'SUPERVISOR': return [...new Set(SUPERVISOR_KEYS)]
    case 'OPERADOR': return [...new Set(OPERADOR_KEYS)]
    case 'GESTOR': return [...GESTOR_KEYS]
    default: return []
  }
}
