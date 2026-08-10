import type { ResolvedRbac } from './types'

/**
 * Single RBAC decision function. Order: wildcard → global → byProperty.
 * Deny by default. Same signature is mirrored in qb-back and qb-panel.
 */
export function can(
  rbac: ResolvedRbac | null | undefined,
  permission: string,
  propertyId?: string,
): boolean {
  if (!rbac) return false
  if (rbac.wildcard) return true
  if (rbac.global.includes(permission)) return true
  if (propertyId && rbac.byProperty[propertyId]?.includes(permission)) return true
  return false
}
