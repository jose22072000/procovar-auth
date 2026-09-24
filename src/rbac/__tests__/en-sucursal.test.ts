/**
 * El alcance sale de QUIÉN PREGUNTA, no del identificador que venga en la petición.
 *
 * Esta es la prueba del ataque de verdad: el administrador de Camagüey manda el id
 * de Holguín. La comprobación vieja (`resolveRbac` + `can`) decía que sí, porque
 * suma los permisos del ROL de la persona aunque no sea miembro de esa sucursal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  member: { findUnique: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))

import { rbacEnSucursal, rolesEnSucursal } from '../en-sucursal'
import { resolveRbac } from '../resolve-permissions'
import { can } from '../can'
import { systemRolePermissionKeys } from '../system-roles'

const CAM = 'org-camaguey'
const HOL = 'org-holguin'

/** El administrador de Camagüey: su rol lleva `member.invite`, y sólo está en CAM. */
const administrador = {
  id: 'u-admin-cam',
  isSystemAdmin: false,
  defaultRole: {
    name: 'ADMINISTRADOR',
    permissions: systemRolePermissionKeys('ADMINISTRADOR').map((key) => ({ permission: { key } })),
  },
}

const membresiaEnCam = {
  id: 'm-cam',
  memberRoles: [
    {
      role: {
        name: 'ADMINISTRADOR',
        permissions: systemRolePermissionKeys('ADMINISTRADOR').map((key) => ({ permission: { key } })),
      },
    },
  ],
}

/** Sólo es miembro de Camagüey. En Holguín, `findUnique` devuelve null. */
function soloEnCamaguey() {
  db.user.findUnique.mockResolvedValue(administrador as never)
  db.member.findUnique.mockImplementation(async (args: { where: { userId_organizationId: { organizationId: string } } }) =>
    args.where.userId_organizationId.organizationId === CAM ? (membresiaEnCam as never) : null,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('el agujero que había', () => {
  it('`resolveRbac` a secas le da member.invite en Holguín, donde NO está', async () => {
    soloEnCamaguey()
    const rbac = await resolveRbac(administrador.id, HOL)
    // No es un fallo de resolveRbac: contesta a otra pregunta («qué lleva encima»).
    // Lo que era un fallo es usarla para decidir si puede actuar SOBRE Holguín.
    expect(can(rbac, 'member.invite')).toBe(true)
  })
})

describe('rbacEnSucursal', () => {
  it('SÍ puede dar de alta en Camagüey, que es la suya', async () => {
    soloEnCamaguey()
    const rbac = await rbacEnSucursal(administrador.id, CAM)
    expect(can(rbac, 'member.invite')).toBe(true)
  })

  it('NO puede dar de alta en Holguín, aunque mande ese id', async () => {
    soloEnCamaguey()
    const rbac = await rbacEnSucursal(administrador.id, HOL)
    expect(can(rbac, 'member.invite')).toBe(false)
    expect(rbac.global).toEqual([])
  })

  it('sin sucursal, nada: eso sólo lo puede el Super Admin', async () => {
    soloEnCamaguey()
    expect(can(await rbacEnSucursal(administrador.id, ''), 'member.invite')).toBe(false)
    expect(can(await rbacEnSucursal(administrador.id, null), 'member.invite')).toBe(false)
  })

  it('el Super Admin sigue pudiendo en todas, sin pertenecer a ninguna', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-super', isSystemAdmin: true } as never)
    db.member.findUnique.mockResolvedValue(null as never)
    const rbac = await rbacEnSucursal('u-super', HOL)
    expect(rbac.wildcard).toBe(true)
    expect(can(rbac, 'member.invite')).toBe(true)
  })
})

describe('rolesEnSucursal', () => {
  it('en la suya, su rol', async () => {
    soloEnCamaguey()
    expect(await rolesEnSucursal(administrador.id, CAM)).toEqual(['ADMINISTRADOR'])
  })

  it('en la ajena, ninguno — así el techo tampoco se calcula con el de otra', async () => {
    soloEnCamaguey()
    expect(await rolesEnSucursal(administrador.id, HOL)).toEqual([])
    expect(await rolesEnSucursal(administrador.id, null)).toEqual([])
  })

  it('suma el rol de la persona y los que tenga en esa sucursal, sin repetir', async () => {
    db.user.findUnique.mockResolvedValue({ defaultRole: { name: 'GESTOR' } } as never)
    db.member.findUnique.mockResolvedValue({
      memberRoles: [{ role: { name: 'SUPERVISOR' } }, { role: { name: 'GESTOR' } }],
    } as never)
    expect((await rolesEnSucursal('u1', CAM)).sort()).toEqual(['GESTOR', 'SUPERVISOR'])
  })
})
