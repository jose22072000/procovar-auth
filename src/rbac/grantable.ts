import type { ResolvedRbac } from './types'

/**
 * Privilege-escalation guard for RBAC grant operations (create a role, edit a
 * role's permissions, assign a role). A caller must never be able to grant a
 * permission they do not themselves hold — otherwise e.g. an `admin` (who lacks
 * `role.delete`/`organization.settings`) could mint a role carrying those keys
 * and self-assign it to become an owner.
 *
 * Roles are organization-scoped and their permission keys are unscoped until the
 * role is assigned (to all properties or to specific ones), so the grantable set
 * is the permissions the actor holds org-wide — `rbac.global` — plus the wildcard
 * escape hatch for system admins (and any future wildcard holder). Per-property
 * holdings are intentionally NOT grantable into a role, since the role could
 * later be assigned to properties where the actor holds nothing.
 *
 * Returns the subset of `requested` the actor may NOT grant. Empty ⇒ allowed.
 * A missing rbac (no resolved actor) denies everything by default.
 */
export function ungrantablePermissionKeys(
  rbac: ResolvedRbac | null | undefined,
  requested: string[],
): string[] {
  const unique = [...new Set(requested)]
  if (!rbac) return unique
  if (rbac.wildcard) return []
  const held = new Set(rbac.global)
  return unique.filter((k) => !held.has(k))
}
