import { describe, it, expect } from 'vitest'
import { SYSTEM_ROLE_NAMES, systemRolePermissionKeys } from '../system-roles'
import { PERMISSION_CATALOG } from '../permissions.catalog'

describe('system roles', () => {
  it('lists the four system roles', () => {
    expect([...SYSTEM_ROLE_NAMES]).toEqual(['owner', 'admin', 'staff', 'agent'])
  })
  it('owner gets every catalog permission', () => {
    expect(systemRolePermissionKeys('owner').sort())
      .toEqual(PERMISSION_CATALOG.filter((p) => !p.isDeprecated).map((p) => p.key).sort())
  })
  it('admin lacks role.delete and organization.settings', () => {
    const admin = systemRolePermissionKeys('admin')
    expect(admin).not.toContain('role.delete')
    expect(admin).not.toContain('organization.settings')
    expect(admin).toContain('member.invite')
  })
  it('agent is read-only basics (incl. viewing reservations)', () => {
    expect(systemRolePermissionKeys('agent').sort())
      .toEqual(['media.read', 'property.read', 'rate.read', 'reservation.read', 'roomType.read'].sort())
  })
  it('staff is operational, no member/role management beyond read', () => {
    const staff = systemRolePermissionKeys('staff')
    expect(staff).toContain('media.upload')
    expect(staff).toContain('room.manage')
    expect(staff).not.toContain('member.invite')
    expect(staff).not.toContain('role.create')
  })
  it('unknown role returns empty', () => {
    expect(systemRolePermissionKeys('nope')).toEqual([])
  })
})
