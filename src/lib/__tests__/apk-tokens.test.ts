/**
 * Las reglas de la puerta por token, una a una.
 *
 * Lo que se prueba aquí no es "que devuelva algo": es que un refresh usado dos
 * veces cierre la cuenta entera, que el par salga NUEVO cada vez, y que el token
 * lleve dentro la sucursal y los roles con los nombres que la API del reparto
 * lee. Las tres cosas fallan en silencio si nadie las mira: un par que repite
 * tokens y una revocación a medias tienen exactamente el mismo aspecto desde
 * fuera que los buenos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'
import { decodeJwt } from 'jose'

// El secreto de firma se lee en cada llamada, así que basta con ponerlo antes de
// importar nada. 32 caracteres es el mínimo que exige `lib/jwt.ts`.
process.env.JWT_SECRET = 'un-secreto-de-pruebas-de-mas-de-32-caracteres'
process.env.APP_URL = 'https://auth.example.com'

// Sin base de datos: Prisma se sustituye entero, como en `role-resolver.test.ts`.
const db = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
    refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    session: { findUnique: vi.fn(), updateMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))
vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
    ErrorDeIdentidad,
    SEGUNDOS_ACCESO,
    SEGUNDOS_REFRESH,
    cerrarSesionDelAparato,
    desdeDondePide,
    emitirPar,
    renovar,
    resolverIdentidad,
} from '../apk-tokens'
import { audit } from '@/lib/audit'

const mockUser = db.user.findUnique
const mockRefresh = db.refreshToken
const mockSession = db.session
const mockAudit = vi.mocked(audit)

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** Una persona de Camagüey, Operadora, con su sucursal y su rol. */
function persona(extra: Record<string, unknown> = {}) {
    return {
        id: 'u1',
        name: 'Yasmani',
        email: 'Yasmani@Procovar.Local',
        username: 'yasmani',
        activo: true,
        isSystemAdmin: false,
        defaultRole: { name: 'OPERADOR' },
        members: [
            {
                organization: { codigo: 'CAM', activa: true },
                memberRoles: [{ role: { name: 'OPERADOR' } }],
            },
        ],
        ...extra,
    }
}

/** Una fila de refresh viva, tal y como sale de la base. */
function fila(extra: Record<string, unknown> = {}) {
    return {
        id: 'rt1',
        userId: 'u1',
        sessionId: 's1',
        familyId: 'fam1',
        expiresAt: new Date(Date.now() + SEGUNDOS_REFRESH * 1000),
        usedAt: null,
        revokedAt: null,
        ...extra,
    }
}

beforeEach(() => {
    vi.resetAllMocks()
    // Por defecto: la persona existe, la sesión está viva y los escritos cuelan.
    mockUser.mockResolvedValue(persona() as never)
    mockSession.findUnique.mockResolvedValue({ revokedAt: null } as never)
    mockSession.updateMany.mockResolvedValue({ count: 1 } as never)
    mockRefresh.updateMany.mockResolvedValue({ count: 1 } as never)
    mockRefresh.update.mockResolvedValue({} as never)
    mockRefresh.findFirst.mockResolvedValue({ sessionId: 's1' } as never)
    let n = 0
    mockRefresh.create.mockImplementation((async () => ({ id: `nueva${++n}` })) as never)
})

describe('el token de acceso lleva la sucursal y los roles', () => {
    it('firma sub, sucursal y roles con los nombres que lee la API del reparto', async () => {
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        const c = decodeJwt(par.token)

        expect(c.sub).toBe('u1')
        // `sucursal` y `branch_id` son los dos nombres del token nuevo.
        expect(c.sucursal).toBe('CAM')
        expect(c.branch_id).toBe('CAM')
        expect(c.roles).toEqual(['OPERADOR'])
        expect(c.role).toBe('OPERADOR')
        expect(c.sid).toBe('s1')
    })

    it('NO usa `branchId`, que en la web significa otra cosa', async () => {
        // En la web `branchId` es el id de la sucursal dentro de la base de
        // delivery; aquí lo que se firma es el CÓDIGO (CAM, HAB…). Escribirlo con
        // ese nombre sería mandar una cosa con la etiqueta de la otra.
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        expect(Object.keys(decodeJwt(par.token))).not.toContain('branchId')
    })

    it('caduca a los 15 minutos', async () => {
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        const c = decodeJwt(par.token)
        const dura = (c.exp as number) - (c.iat as number)
        expect(dura).toBe(SEGUNDOS_ACCESO)
        expect(par.expires_in).toBe(SEGUNDOS_ACCESO)
    })

    it('va etiquetado, para que no cuele como otro token de la casa', async () => {
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        expect(decodeJwt(par.token).purpose).toBe('apk:access')
    })

    it('junta el rol de la persona con los de sus membresías, sin repetir', async () => {
        mockUser.mockResolvedValue(
            persona({
                defaultRole: { name: 'SUPERVISOR' },
                members: [
                    {
                        organization: { codigo: 'GR', activa: true },
                        memberRoles: [{ role: { name: 'SUPERVISOR' } }, { role: { name: 'GESTOR' } }],
                    },
                ],
            }) as never
        )
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        expect(decodeJwt(par.token).roles).toEqual(['SUPERVISOR', 'GESTOR'])
    })
})

describe('qué sucursal se firma', () => {
    it('el Super Admin la lleva vacía: es quien ve las ocho', async () => {
        mockUser.mockResolvedValue(persona({ isSystemAdmin: true, members: [] }) as never)
        const id = await resolverIdentidad('u1')
        expect(id.sucursal).toBe('')
    })

    it('quien está en varias y no pide ninguna se lleva la más antigua', async () => {
        mockUser.mockResolvedValue(
            persona({
                members: [
                    { organization: { codigo: 'CAM', activa: true }, memberRoles: [] },
                    { organization: { codigo: 'HOL', activa: true }, memberRoles: [] },
                ],
            }) as never
        )
        const id = await resolverIdentidad('u1')
        expect(id.sucursal).toBe('CAM')
        expect(id.sucursales).toEqual(['CAM', 'HOL'])
    })

    it('respeta la sucursal pedida cuando es suya', async () => {
        mockUser.mockResolvedValue(
            persona({
                members: [
                    { organization: { codigo: 'CAM', activa: true }, memberRoles: [] },
                    { organization: { codigo: 'HOL', activa: true }, memberRoles: [] },
                ],
            }) as never
        )
        expect((await resolverIdentidad('u1', 'HOL')).sucursal).toBe('HOL')
    })

    it('no deja pedir una sucursal ajena', async () => {
        await expect(resolverIdentidad('u1', 'STG')).rejects.toMatchObject({ motivo: 'sin_sucursal' })
    })

    it('NO firma a quien no está en ninguna sucursal y no es Super Admin', async () => {
        // Es la parte que más importa de todo este bloque: para la API del reparto
        // un token SIN sucursal no está limitado, está abierto a las ocho. Un
        // fallo aquí no se ve —sale un 200 con más pedidos de la cuenta— y enseña
        // la operación entera a quien no debería ver ni una.
        mockUser.mockResolvedValue(persona({ members: [] }) as never)
        await expect(resolverIdentidad('u1')).rejects.toMatchObject({ motivo: 'sin_sucursal' })
    })

    it('ignora las sucursales cerradas', async () => {
        mockUser.mockResolvedValue(
            persona({
                members: [
                    { organization: { codigo: 'CAM', activa: false }, memberRoles: [] },
                    { organization: { codigo: 'HOL', activa: true }, memberRoles: [] },
                ],
            }) as never
        )
        expect((await resolverIdentidad('u1')).sucursal).toBe('HOL')
    })

    it('a quien está dado de baja no se le firma nada', async () => {
        mockUser.mockResolvedValue(persona({ activo: false }) as never)
        await expect(resolverIdentidad('u1')).rejects.toBeInstanceOf(ErrorDeIdentidad)
    })
})

describe('el refresh que se guarda', () => {
    it('en la base va el sha256, nunca el token', async () => {
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        const guardado = mockRefresh.create.mock.calls[0][0].data

        expect(guardado.tokenHash).toBe(sha256(par.refresh_token))
        expect(JSON.stringify(guardado)).not.toContain(par.refresh_token)
    })

    it('dura 30 días', async () => {
        const par = await emitirPar({ userId: 'u1', sessionId: 's1' })
        expect(par.refresh_expires_in).toBe(SEGUNDOS_REFRESH)
    })

    it('un acceso nuevo abre una cadena nueva; una renovación hereda la suya', async () => {
        await emitirPar({ userId: 'u1', sessionId: 's1' })
        await emitirPar({ userId: 'u1', sessionId: 's1' })
        const a = mockRefresh.create.mock.calls[0][0].data.familyId
        const b = mockRefresh.create.mock.calls[1][0].data.familyId
        expect(a).not.toBe(b)

        await emitirPar({ userId: 'u1', sessionId: 's1', familyId: 'fam1' })
        expect(mockRefresh.create.mock.calls[2][0].data.familyId).toBe('fam1')
    })
})

describe('renovar devuelve un par NUEVO y gasta el viejo', () => {
    it('los dos tokens cambian, no sólo el de acceso', async () => {
        const primero = await emitirPar({ userId: 'u1', sessionId: 's1' })
        mockRefresh.findUnique.mockResolvedValue(fila() as never)

        const salida = await renovar(primero.refresh_token)

        expect(salida.ok).toBe(true)
        if (!salida.ok) return
        expect(salida.par.refresh_token).not.toBe(primero.refresh_token)
        expect(salida.par.token).not.toBe(primero.token)
    })

    it('marca el viejo como gastado antes de emitir', async () => {
        mockRefresh.findUnique.mockResolvedValue(fila() as never)
        await renovar('lo-que-sea')

        // El gasto va condicionado a que siga limpio: es lo único que impide que
        // dos renovaciones a la vez con el mismo token salgan las dos adelante.
        const [args] = mockRefresh.updateMany.mock.calls[0]
        expect(args.where).toMatchObject({ id: 'rt1', usedAt: null, revokedAt: null })
        expect(args.data.usedAt).toBeInstanceOf(Date)
    })

    it('deja escrito cuál sustituyó a cuál', async () => {
        mockRefresh.findUnique.mockResolvedValue(fila() as never)
        await renovar('lo-que-sea')
        expect(mockRefresh.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'rt1' }, data: { replacedBy: 'nueva1' } })
        )
    })

    it('estira la sesión, para que no se muera antes que el refresh', async () => {
        mockRefresh.findUnique.mockResolvedValue(fila() as never)
        await renovar('lo-que-sea')

        const estirada = mockSession.updateMany.mock.calls.find(
            ([a]) => (a.data as { expiresAt?: Date }).expiresAt
        )
        expect(estirada).toBeDefined()
    })
})

describe('un refresh reutilizado es un robo', () => {
    it('cierra TODAS las sesiones de la cuenta, no sólo ese aparato', async () => {
        mockRefresh.findUnique.mockResolvedValue(fila({ usedAt: new Date('2026-09-01') }) as never)

        const salida = await renovar('el-viejo')

        expect(salida).toEqual({ ok: false, motivo: 'reuse' })
        // Las dos cosas: los refresh Y las sesiones de better-auth. Revocar sólo
        // una mitad deja la otra puerta abierta.
        expect(mockRefresh.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
        )
        expect(mockSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
        )
    })

    it('no emite ningún par', async () => {
        mockRefresh.findUnique.mockResolvedValue(fila({ usedAt: new Date('2026-09-01') }) as never)
        await renovar('el-viejo')
        expect(mockRefresh.create).not.toHaveBeenCalled()
    })

    it('queda en la auditoría con nombre propio', async () => {
        mockRefresh.findUnique.mockResolvedValue(fila({ usedAt: new Date('2026-09-01') }) as never)
        await renovar('el-viejo')
        expect(mockAudit).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'auth.refresh.reuse', userId: 'u1' })
        )
    })

    it('dos a la vez: la que pierde la carrera también cuenta como robo', async () => {
        // Las dos leen la fila limpia; sólo una consigue gastarla. La otra NO puede
        // salir adelante — si lo hiciera, el mismo refresh habría emitido dos pares
        // válidos, que es justo lo que esta regla persigue.
        mockRefresh.findUnique.mockResolvedValue(fila() as never)
        mockRefresh.updateMany.mockResolvedValueOnce({ count: 0 } as never)

        const salida = await renovar('el-mismo')

        expect(salida).toEqual({ ok: false, motivo: 'reuse' })
        expect(mockSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
        )
    })
})

describe('lo que NO es un robo', () => {
    it('un token que no existe no revoca nada', async () => {
        // No dice de quién es, así que no hay cuenta que cerrar. Tratarlo como robo
        // dejaría a cualquiera cerrar sesiones ajenas mandando tokens inventados.
        mockRefresh.findUnique.mockResolvedValue(null as never)

        expect(await renovar('inventado')).toEqual({ ok: false, motivo: 'invalid' })
        expect(mockSession.updateMany).not.toHaveBeenCalled()
        expect(mockRefresh.updateMany).not.toHaveBeenCalled()
    })

    it('uno que revocamos nosotros no dispara la revocación en cadena', async () => {
        // Cerrar sesión y volver a intentarlo con el token viejo es torpe, no un
        // robo. Si contara como robo, cada logout con reintento cerraría la cuenta.
        mockRefresh.findUnique.mockResolvedValue(fila({ revokedAt: new Date('2026-09-01') }) as never)

        expect(await renovar('ya-cerrado')).toEqual({ ok: false, motivo: 'revoked' })
        expect(mockAudit).not.toHaveBeenCalledWith(
            expect.objectContaining({ action: 'auth.refresh.reuse' })
        )
    })

    it('uno caducado se cierra y ya', async () => {
        mockRefresh.findUnique.mockResolvedValue(
            fila({ expiresAt: new Date(Date.now() - 1000) }) as never
        )
        expect(await renovar('viejo')).toEqual({ ok: false, motivo: 'expired' })
        expect(mockRefresh.create).not.toHaveBeenCalled()
    })

    it('si revocaron la sesión desde el panel, la APK se cae aquí', async () => {
        mockSession.findUnique.mockResolvedValue({ revokedAt: new Date('2026-09-01') } as never)
        mockRefresh.findUnique.mockResolvedValue(fila() as never)

        expect(await renovar('con-sesion-muerta')).toEqual({ ok: false, motivo: 'revoked' })
        expect(mockRefresh.create).not.toHaveBeenCalled()
    })

    it('si dieron de baja a la persona, tampoco renueva', async () => {
        mockUser.mockResolvedValue(persona({ activo: false }) as never)
        mockRefresh.findUnique.mockResolvedValue(fila() as never)

        expect(await renovar('de-un-despedido')).toEqual({ ok: false, motivo: 'revoked' })
    })
})

describe('cerrar sesión desde el aparato', () => {
    it('cierra su cadena y su sesión, y nada más', async () => {
        mockRefresh.findUnique.mockResolvedValue(
            { id: 'rt1', userId: 'u1', familyId: 'fam1' } as never
        )

        await cerrarSesionDelAparato('el-suyo')

        expect(mockRefresh.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { familyId: 'fam1', revokedAt: null } })
        )
        // Por cadena, NO por cuenta: quien cierra sesión en el teléfono no está
        // diciendo que le hayan robado nada, y echarle de paso la sesión web sería
        // una sorpresa desagradable.
        expect(mockRefresh.updateMany).not.toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
        )
    })

    it('un token desconocido no hace nada y no revienta', async () => {
        mockRefresh.findUnique.mockResolvedValue(null as never)
        await expect(cerrarSesionDelAparato('inventado')).resolves.toBeUndefined()
        expect(mockRefresh.updateMany).not.toHaveBeenCalled()
    })
})

describe('de dónde viene la petición', () => {
    it('lee las cabeceras en el mismo orden que lib/auth.ts', () => {
        const h = new Headers({
            'x-forwarded-for': '9.9.9.9, 10.0.0.1',
            'x-real-ip': '8.8.8.8',
            'cf-connecting-ip': '7.7.7.7',
            'user-agent': 'reparto/1.0',
        })
        expect(desdeDondePide(h)).toEqual({ ip: '7.7.7.7', userAgent: 'reparto/1.0' })
    })

    it('de la cadena de x-forwarded-for se queda con el primero', () => {
        const h = new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })
        expect(desdeDondePide(h).ip).toBe('9.9.9.9')
    })
})
