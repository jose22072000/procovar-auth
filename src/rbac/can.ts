import type { ResolvedRbac } from './types'

/**
 * The single RBAC decision. Deny by default.
 *
 * Order: system admin → does this member hold the permission in this sucursal.
 * Every app asks the same question the same way, so an answer cannot drift
 * between PEDIDO, analitics, delivery and ccsa.
 */
export function can(rbac: ResolvedRbac | null | undefined, permission: string): boolean {
  if (!rbac) return false
  if (rbac.wildcard) return true
  return rbac.global.includes(permission)
}
