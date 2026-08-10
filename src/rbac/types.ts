export type PermissionKey = string

export interface PermissionEntry {
  key: PermissionKey
  resource: string
  action: string
  service: string
  group: string
  label: { es: string; en: string }
  description?: { es: string; en: string }
  isDeprecated?: boolean
}

export interface ResolvedRbac {
  org: string | null
  wildcard: boolean
  global: PermissionKey[]
  byProperty: Record<string, PermissionKey[]>
}
