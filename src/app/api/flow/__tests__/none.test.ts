import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const cookieStore = {
	get: vi.fn(),
	set: vi.fn(),
	delete: vi.fn(),
}
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }))

process.env.APP_URL = 'https://account.example.com'

import { GET } from '../none/route'

const FLOW_COOKIE = 'qb.flow_state'

function flowCookie(value: unknown) {
	cookieStore.get.mockImplementation((name: string) =>
		name === FLOW_COOKIE ? { value: JSON.stringify(value) } : undefined,
	)
}

describe('GET /api/flow/none — silent SSO probe bounce', () => {
	beforeEach(() => {
		cookieStore.get.mockReset()
		cookieStore.set.mockReset()
		cookieStore.delete.mockReset()
	})

	it('bounces back to the calling app with ?sso=none and clears the flow cookie', async () => {
		flowCookie({ origin: 'https://hostravel.com/api/auth/callback', prompt: 'none', redirectOrigin: true })

		const res = await GET()

		expect(res.status).toBe(307)
		const location = new URL(res.headers.get('location')!)
		expect(location.origin + location.pathname).toBe('https://hostravel.com/api/auth/callback')
		expect(location.searchParams.get('sso')).toBe('none')
		expect(cookieStore.delete).toHaveBeenCalledWith(FLOW_COOKIE)
	})

	it('hands returnTo back so the caller can restore the page the visitor asked for', async () => {
		flowCookie({
			origin: 'https://hostravel.com/api/auth/callback',
			returnTo: 'https://hostravel.com/search?city=madrid',
			prompt: 'none',
		})

		const res = await GET()

		const location = new URL(res.headers.get('location')!)
		expect(location.searchParams.get('returnTo')).toBe('https://hostravel.com/search?city=madrid')
		expect(location.searchParams.get('sso')).toBe('none')
	})

	it('omits returnTo when the flow state has none', async () => {
		flowCookie({ origin: 'https://hostravel.com/api/auth/callback', prompt: 'none' })

		const res = await GET()

		expect(new URL(res.headers.get('location')!).searchParams.has('returnTo')).toBe(false)
	})

	it('keeps any query the calling app already had on its callback URL', async () => {
		flowCookie({ origin: 'https://hostravel.com/api/auth/callback?returnTo=%2Fsearch', prompt: 'none' })

		const res = await GET()

		const location = new URL(res.headers.get('location')!)
		expect(location.searchParams.get('returnTo')).toBe('/search')
		expect(location.searchParams.get('sso')).toBe('none')
	})

	it('falls back to the sign-in page when there is no flow cookie', async () => {
		cookieStore.get.mockReturnValue(undefined)

		const res = await GET()

		expect(res.headers.get('location')).toBe('https://account.example.com/')
		expect(cookieStore.delete).toHaveBeenCalledWith(FLOW_COOKIE)
	})

	it('falls back to the sign-in page when the flow state is not a silent probe', async () => {
		flowCookie({ origin: 'https://hostravel.com/api/auth/callback', redirectOrigin: true })

		const res = await GET()

		expect(res.headers.get('location')).toBe('https://account.example.com/')
	})

	it('falls back to the sign-in page when the origin is not a usable absolute URL', async () => {
		flowCookie({ origin: 'not a url', prompt: 'none' })

		const res = await GET()

		expect(res.headers.get('location')).toBe('https://account.example.com/')
	})

	it('never throws on a corrupt flow cookie', async () => {
		cookieStore.get.mockImplementation((name: string) =>
			name === FLOW_COOKIE ? { value: '{not json' } : undefined,
		)

		await expect(GET()).resolves.toBeDefined()
	})
})

describe('server components never mutate cookies during render', () => {
	// Next.js throws "Cookies can only be modified in a Server Action or Route
	// Handler" when a page/layout writes a cookie while rendering. That surfaced
	// as a 500 on the sign-in page for every anonymous silent-SSO probe, which
	// took the public site down for logged-out visitors. Cookie writes belong in
	// route handlers; this pins that rule for every server component.
	const MUTATION = /clearFlowState\s*\(|cookieStore\.(set|delete)\s*\(|cookies\(\)\.(set|delete)\s*\(/

	it('no page.tsx or layout.tsx writes or deletes a cookie', () => {
		const appDir = path.join(process.cwd(), 'src/app')
		const files = readdirSync(appDir, { recursive: true, encoding: 'utf8' }).filter((f) =>
			/(^|[\\/])(page|layout)\.tsx$/.test(f),
		)
		expect(files.length).toBeGreaterThan(0)

		const offenders = files.filter((f) => MUTATION.test(readFileSync(path.join(appDir, f), 'utf8')))
		expect(offenders).toEqual([])
	})
})
