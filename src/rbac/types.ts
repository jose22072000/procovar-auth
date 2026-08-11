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

/**
 * What one person can do in ONE sucursal.
 *
 * `org` IS the sucursal — that is the whole scope. There used to be a
 * `byProperty` map here, from the lodging business this code came from; Procovar
 * has no properties, so a permission is simply held or not held within the
 * sucursal the member belongs to. Someone who works in two sucursales is two
 * members, and resolves once per sucursal.
 */
export interface ResolvedRbac {
  org: string | null
  /** System admin: everything, everywhere. No membership needed. */
  wildcard: boolean
  global: PermissionKey[]
}
