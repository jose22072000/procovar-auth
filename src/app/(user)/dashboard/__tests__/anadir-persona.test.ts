/**
 * Dar de alta a una persona, visto desde la puerta.
 *
 * Aquí no se prueba el escalafón otra vez —eso está en `rbac/__tests__`— sino lo
 * único que se ve desde fuera y es lo que importa: que cuando la respuesta es "no",
 * NO SE CREA NADA. Una guarda que devuelve un error y aun así llama a `altaPersona`
 * es exactamente el fallo que se está evitando.
 *
 * Las dos parejas del encargo:
 *   - Camagüey sí / Holguín no, mandando el id ajeno en el cuerpo.
 *   - Los roles de debajo sí / SUPER ADMIN y DESARROLLADOR no.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { systemRolePermissionKeys } from '@/rbac/system-roles'

const CAM = 'org-camaguey'
const HOL = 'org-holguin'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  member: { findUnique: vi.fn() },
  role: { findUnique: vi.fn() },
}))
const sesion = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const alta = vi.hoisted(() => ({ altaPersona: vi.fn(), esSuperAdmin: vi.fn(() => false) }))

vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/server/auth.server', () => sesion)
vi.mock('@/lib/alta-persona', () => alta)
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))
vi.mock('@/lib/redis', () => ({ getRedis: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('better-auth/crypto', () => ({ hashPassword: vi.fn(async () => 'hash') }))

import { anadirPersona } from '../_actions'

const YO = 'u-admin-cam'

function permisosDe(nombre: string) {
  return systemRolePermissionKeys(nombre).map((key) => ({ permission: { key } }))
}

/** Administrador de Camagüey y de ninguna otra. */
function administradorDeCamaguey() {
  sesion.getCurrentUser.mockResolvedValue({ data: { id: YO, isSystemAdmin: false } })
  db.user.findUnique.mockResolvedValue({
    id: YO,
    isSystemAdmin: false,
    defaultRole: { name: 'ADMINISTRADOR', permissions: permisosDe('ADMINISTRADOR') },
  })
  db.member.findUnique.mockImplementation(
    async (args: { where: { userId_organizationId: { organizationId: string } } }) =>
      args.where.userId_organizationId.organizationId === CAM
        ? { id: 'm-cam', memberRoles: [{ role: { name: 'ADMINISTRADOR', permissions: permisosDe('ADMINISTRADOR') } }] }
        : null,
  )
}

/** El rol que se pide dar, tal y como lo devolvería la base. */
function elRolPedidoEs(nombre: string) {
  db.role.findUnique.mockResolvedValue({ name: nombre, permissions: permisosDe(nombre) })
}

const DATOS = {
  nombre: 'Yaimara Pérez',
  usuario: 'yaimara.perez',
  password: 'unaclavelarga',
  roleId: 'rol-x',
  codigoVendedor: 'yaimara.perez',
}

beforeEach(() => {
  vi.resetAllMocks()
  alta.altaPersona.mockResolvedValue({ userId: 'u-nuevo', memberId: 'm-nuevo' })
  alta.esSuperAdmin.mockReturnValue(false)
})

describe('la sucursal sale de quién pregunta, no del cuerpo de la petición', () => {
  it('SÍ crea un GESTOR en Camagüey, que es la suya', async () => {
    administradorDeCamaguey()
    elRolPedidoEs('GESTOR')
    const res = await anadirPersona({ ...DATOS, organizationId: CAM })
    expect(res.error).toBeUndefined()
    expect(alta.altaPersona).toHaveBeenCalledOnce()
    expect(alta.altaPersona.mock.calls[0][0]).toMatchObject({ organizationId: CAM })
  })

  it('NO crea nada en Holguín aunque mande ese id en el cuerpo', async () => {
    administradorDeCamaguey()
    elRolPedidoEs('GESTOR')
    const res = await anadirPersona({ ...DATOS, organizationId: HOL })
    expect(res.error).toBe('No puedes hacer esto en esta sucursal.')
    expect(alta.altaPersona).not.toHaveBeenCalled()
  })

  it('NO crea una cuenta suelta, sin sucursal: eso es del Super Admin', async () => {
    administradorDeCamaguey()
    elRolPedidoEs('GESTOR')
    const res = await anadirPersona({ ...DATOS, organizationId: '' })
    expect(res.error).toBe('Esto solo lo puede hacer un Super Admin.')
    expect(alta.altaPersona).not.toHaveBeenCalled()
  })
})

describe('sólo los roles de debajo del suyo', () => {
  it.each(['GERENTE', 'SUPERVISOR', 'GESTOR', 'OPERADOR'])('SÍ puede crear un %s', async (nombre) => {
    administradorDeCamaguey()
    elRolPedidoEs(nombre)
    const res = await anadirPersona({ ...DATOS, organizationId: CAM })
    expect(res.error).toBeUndefined()
    expect(alta.altaPersona).toHaveBeenCalledOnce()
  })

  it.each(['SUPER ADMIN', 'DESARROLLADOR', 'ADMINISTRADOR'])('NO puede crear un %s, y no crea nada', async (nombre) => {
    administradorDeCamaguey()
    elRolPedidoEs(nombre)
    const res = await anadirPersona({ ...DATOS, organizationId: CAM })
    expect(res.error).toContain('por debajo del tuyo')
    expect(alta.altaPersona).not.toHaveBeenCalled()
  })
})

describe('el Super Admin', () => {
  beforeEach(() => {
    sesion.getCurrentUser.mockResolvedValue({ data: { id: 'u-super', isSystemAdmin: true } })
    db.user.findUnique.mockResolvedValue({ id: 'u-super', isSystemAdmin: true })
    db.member.findUnique.mockResolvedValue(null)
  })

  it('crea en cualquier sucursal y con cualquier rol', async () => {
    elRolPedidoEs('ADMINISTRADOR')
    const res = await anadirPersona({ ...DATOS, organizationId: HOL })
    expect(res.error).toBeUndefined()
    expect(alta.altaPersona).toHaveBeenCalledOnce()
  })

  it('y sigue pudiendo abrir una cuenta sin sucursal, como en Personas', async () => {
    elRolPedidoEs('GESTOR')
    const res = await anadirPersona({ ...DATOS, organizationId: '' })
    expect(res.error).toBeUndefined()
  })
})
