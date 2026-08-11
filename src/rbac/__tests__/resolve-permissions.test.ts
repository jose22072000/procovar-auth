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
  it('el Super Admin llega a todo', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: true } as never)
    const r = await resolveRbac('u1', 'o1')
    expect(r.wildcard).toBe(true)
  })

  it('sin sucursal, nada — salvo el Super Admin', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as never)
    const r = await resolveRbac('u1', null)
    expect(r).toEqual({ org: null, wildcard: false, global: [] })
  })

  it('quien no es de la sucursal no puede nada en ella', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as never)
    mockMemberFindUnique.mockResolvedValue(null)
    const r = await resolveRbac('u1', 'o1')
    expect(r.global).toEqual([])
  })

  it('con varios roles, suma lo que dan todos', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as never)
    mockMemberFindUnique.mockResolvedValue({
      id: 'm1',
      memberRoles: [
        { role: { permissions: [
          { permission: { key: 'pedido.read' } },
          { permission: { key: 'cliente.read' } },
        ] } },
        { role: { permissions: [
          { permission: { key: 'pedido.complete' } },
          // Repetido a propósito: dos roles pueden dar el mismo permiso y no
          // debe aparecer dos veces.
          { permission: { key: 'pedido.read' } },
        ] } },
      ],
    } as never)
    const r = await resolveRbac('u1', 'o1')
    expect(r.global.sort()).toEqual(['cliente.read', 'pedido.complete', 'pedido.read'])
  })

  it('un permiso que ya no existe en el catálogo no tumba la sesión', async () => {
    // role_permission no tiene clave foránea: una fila puede apuntar a un
    // permiso borrado y Prisma devuelve `permission: null`. Leerlo a pelo
    // reventaba verify-session con un 500, y la aplicación que preguntaba lo
    // interpretaba como "no hay sesión" y echaba fuera a la persona.
    mockUserFindUnique.mockResolvedValue({ id: 'u1', isSystemAdmin: false } as never)
    mockMemberFindUnique.mockResolvedValue({
      id: 'm1',
      memberRoles: [
        { role: { permissions: [
          { permission: null },
          { permission: { key: 'pedido.read' } },
        ] } },
      ],
    } as never)
    const r = await resolveRbac('u1', 'o1')
    expect(r.global).toEqual(['pedido.read'])
  })
})
