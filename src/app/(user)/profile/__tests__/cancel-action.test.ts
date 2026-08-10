import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
	headers: vi.fn(async () => new Headers()),
	cookies: vi.fn(async () => ({ get: vi.fn().mockReturnValue({ value: 'sess-123' }) })),
}))
vi.mock('@/lib/flow-state', () => ({ getSessionCookieName: vi.fn(() => 'qb.session_token') }))

process.env.QB_BACKEND_URL = 'http://localhost:5100/api'
process.env.BEARER_TOKEN = 'test-bearer'

import { requestReservationCancel } from '../_actions'

describe('requestReservationCancel', () => {
	beforeEach(() => vi.restoreAllMocks())

	it('POSTs to /reservations/:id/cancel and returns ok+status', async () => {
		const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, status: 'CANCELLED' }) }))
		vi.stubGlobal('fetch', fetchMock as any)
		const r = await requestReservationCancel('5')
		expect(r).toEqual({ ok: true, status: 'CANCELLED' })
		const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, any]
		expect(String(url)).toContain('/reservations/5/cancel')
		expect(opts.method).toBe('POST')
		expect(opts.headers.Cookie).toContain('qb.session_token=sess-123')
	})

	it('returns ok:false on backend error without throwing', async () => {
		const fetchMock = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ code: 'NOT_CANCELABLE' }) }))
		vi.stubGlobal('fetch', fetchMock as any)
		const r = await requestReservationCancel('5')
		expect(r.ok).toBe(false)
		expect(r.error).toBe('NOT_CANCELABLE')
	})
})
