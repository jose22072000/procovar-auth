import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const mockUser = { findUnique: vi.fn() }
  const mockMember = { findUnique: vi.fn() }
  return {
    prisma: {
      user: mockUser,
      member: mockMember,
      systemConfig: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
    },
  }
})

import { resolveRbac } from '../resolve-permissions'
import { prisma } from '@/lib/prisma'

const mockUserFindUnique = vi.mocked(prisma.user.findUnique)
const mockMemberFindUnique = vi.mocked(prisma.member.findUnique)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolveRbac', () => {
  it('system admin → wildcard', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: true } as any)
    const r = await resolveRbac('u1', 'o1')
    expect(r.wildcard).toBe(true)
  })

  it('no org → empty', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as any)
    const r = await resolveRbac('u1', null)
    expect(r).toEqual({ org: null, wildcard: false, global: [], byProperty: {} })
  })

  it('not a member → empty', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as any)
    mockMemberFindUnique.mockResolvedValue(null)
    const r = await resolveRbac('u1', 'o1')
    expect(r.global).toEqual([])
  })

  it('unions roles and splits by scope', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as any)
    mockMemberFindUnique.mockResolvedValue({
      id: 'm1',
      memberRoles: [
        { scopeAllProperties: true, propertyIds: [],
          role: { permissions: [
            { permission: { key: 'property.read' } },
            { permission: { key: 'media.read' } },
          ] } },
        { scopeAllProperties: false, propertyIds: ['p1', 'p2'],
          role: { permissions: [
            { permission: { key: 'property.edit' } },
          ] } },
      ],
    } as any)
    const r = await resolveRbac('u1', 'o1')
    expect(r.global.sort()).toEqual(['media.read', 'property.read'])
    expect(r.byProperty).toEqual({ p1: ['property.edit'], p2: ['property.edit'] })
  })
})
