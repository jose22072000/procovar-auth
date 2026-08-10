import { PERMISSION_CATALOG } from './permissions.catalog'
import type { PermissionEntry } from './types'
import { SYSTEM_ROLE_NAMES } from './system-roles'

export function diffSeedPermissions(existingKeys: string[]): PermissionEntry[] {
  const have = new Set(existingKeys)
  return PERMISSION_CATALOG.filter((p) => !have.has(p.key))
}

export function legacyRoleToSystemRole(role: string): string {
  const known = new Set<string>(SYSTEM_ROLE_NAMES)
  if (known.has(role)) return role
  return 'agent' // better-auth "member" and anything unknown
}
