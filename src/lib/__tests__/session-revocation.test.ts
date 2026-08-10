import { describe, it, expect, vi, beforeEach } from 'vitest'

// session-revocation.ts imports prisma via the relative './prisma' path.
vi.mock('../prisma', () => ({
    prisma: {
        session: { findUnique: vi.fn() },
    },
}))

import { isSessionRevoked } from '../session-revocation'
import { prisma } from '../prisma'

const mockSessionFindUnique = vi.mocked(prisma.session.findUnique)

beforeEach(() => {
    vi.resetAllMocks()
})

describe('isSessionRevoked', () => {
    it('returns TRUE when Session.revokedAt is set (revoked session is rejected)', async () => {
        mockSessionFindUnique.mockResolvedValue({ revokedAt: new Date('2020-01-01T00:00:00Z') } as any)
        await expect(isSessionRevoked('s1')).resolves.toBe(true)
    })

    it('returns FALSE when Session.revokedAt is null (live session passes)', async () => {
        mockSessionFindUnique.mockResolvedValue({ revokedAt: null } as any)
        await expect(isSessionRevoked('s1')).resolves.toBe(false)
    })

    it('returns FALSE when the session row does not exist', async () => {
        mockSessionFindUnique.mockResolvedValue(null as any)
        await expect(isSessionRevoked('missing')).resolves.toBe(false)
    })

    it('returns FALSE (short-circuits, no DB hit) for a missing session id', async () => {
        await expect(isSessionRevoked(null)).resolves.toBe(false)
        await expect(isSessionRevoked(undefined)).resolves.toBe(false)
        expect(mockSessionFindUnique).not.toHaveBeenCalled()
    })
})
