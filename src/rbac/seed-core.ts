import { PERMISSION_CATALOG } from './permissions.catalog'
import type { PermissionEntry } from './types'
import { SYSTEM_ROLE_NAMES, ROL_MINIMO } from './system-roles'

export function diffSeedPermissions(existingKeys: string[]): PermissionEntry[] {
  const have = new Set(existingKeys)
  return PERMISSION_CATALOG.filter((p) => !have.has(p.key))
}

/**
 * Turn whatever string sits in `member.role` into one of our five roles.
 *
 * better-auth writes its own values there (`member`, `owner`) when it creates a
 * membership, and older rows may carry anything. An unknown value falls back to
 * the most limited role — never to a powerful one, because the fallback path is
 * exactly where a typo would otherwise hand somebody the keys.
 */
export function legacyRoleToSystemRole(role: string): string {
  const known = new Set<string>(SYSTEM_ROLE_NAMES)
  const normalizado = (role || '').toUpperCase().trim()
  if (known.has(normalizado)) return normalizado
  return ROL_MINIMO
}
