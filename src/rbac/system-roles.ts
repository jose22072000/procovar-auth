import { PERMISSION_CATALOG } from './permissions.catalog'

export const SYSTEM_ROLE_NAMES = ['owner', 'admin', 'staff', 'agent'] as const
export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number]

const allKeys = () => PERMISSION_CATALOG.filter((p) => !p.isDeprecated).map((p) => p.key)

const AGENT_KEYS = ['property.read', 'roomType.read', 'media.read', 'rate.read', 'reservation.read']

const STAFF_KEYS = [
  ...AGENT_KEYS,
  'roomType.edit', 'room.manage',
  'media.upload', 'media.edit',
  'rate.edit', 'pricing.manage',
  'member.read',
  'refund.read', 'refund.manage',
]

const ADMIN_EXCLUDED = new Set(['role.delete', 'organization.settings'])

export function systemRolePermissionKeys(role: string): string[] {
  switch (role) {
    case 'owner': return allKeys()
    case 'admin': return allKeys().filter((k) => !ADMIN_EXCLUDED.has(k))
    case 'staff': return [...new Set(STAFF_KEYS)]
    case 'agent': return [...AGENT_KEYS]
    default: return []
  }
}
