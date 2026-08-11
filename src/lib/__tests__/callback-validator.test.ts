import { describe, it, expect, vi, beforeEach } from 'vitest'

// callback-validator.ts imports prisma via the RELATIVE './prisma' path (not
// '@/lib/prisma'), so mock that exact specifier. The factory replaces the real
// module, so the pg/adapter connection code never runs.
vi.mock('../prisma', () => ({
    prisma: {
        clientApp: { findFirst: vi.fn() },
    },
}))

import { validateCallbackPayload, CallbackValidationError } from '../callback-validator'
import { prisma } from '../prisma'

const mockClientAppFindFirst = vi.mocked(prisma.clientApp.findFirst)

// The active client the ?op= redirect path resolves before honouring an origin.
const CLIENT = {
    id: 'c1',
    clientId: 'qbt',
    name: 'QBT',
    allowedCallbackUrls: ['https://booking.example.com/callback'],
    allowedDomains: ['example.com'],
    scopes: [],
}

beforeEach(() => {
    vi.resetAllMocks()
    // No tenant domains registered → only the static allowlist applies.
})

describe('validateCallbackPayload (the check the ?op= path now performs)', () => {
    it('REJECTS an attacker origin not in the allowlist', async () => {
        mockClientAppFindFirst.mockResolvedValue(CLIENT as any)
        await expect(
            validateCallbackPayload({ clientId: 'qbt', callbackUrl: 'https://evil.com/x' }),
        ).rejects.toBeInstanceOf(CallbackValidationError)
        await expect(
            validateCallbackPayload({ clientId: 'qbt', callbackUrl: 'https://evil.com/x' }),
        ).rejects.toMatchObject({ code: 'callback_not_allowed' })
    })

    it('RESOLVES for an allowlisted callback origin (legit ?op= redirect)', async () => {
        mockClientAppFindFirst.mockResolvedValue(CLIENT as any)
        const client = await validateCallbackPayload({
            clientId: 'qbt',
            callbackUrl: 'https://booking.example.com/callback',
        })
        expect(client.clientId).toBe('qbt')
    })

    it('rejects a returnTo whose host is not in allowedDomains', async () => {
        mockClientAppFindFirst.mockResolvedValue(CLIENT as any)
        await expect(
            validateCallbackPayload({
                clientId: 'qbt',
                callbackUrl: 'https://booking.example.com/callback',
                returnTo: 'https://evil.com/steal',
            }),
        ).rejects.toMatchObject({ code: 'return_to_not_allowed' })
    })

    it('rejects an unknown / inactive client', async () => {
        mockClientAppFindFirst.mockResolvedValue(null as any)
        await expect(
            validateCallbackPayload({ clientId: 'ghost', callbackUrl: 'https://evil.com/x' }),
        ).rejects.toMatchObject({ code: 'unknown_client' })
    })
})
