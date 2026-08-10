import { describe, it, expect } from 'vitest'
import { legacyRoleToSystemRole } from '../seed-core'

describe('legacyRoleToSystemRole', () => {
  it('maps known roles to themselves', () => {
    expect(legacyRoleToSystemRole('owner')).toBe('owner')
    expect(legacyRoleToSystemRole('admin')).toBe('admin')
    expect(legacyRoleToSystemRole('staff')).toBe('staff')
    expect(legacyRoleToSystemRole('agent')).toBe('agent')
  })
  it('maps better-auth "member" to agent', () => {
    expect(legacyRoleToSystemRole('member')).toBe('agent')
  })
  it('unknown → agent', () => {
    expect(legacyRoleToSystemRole('whatever')).toBe('agent')
  })
})
