import { describe, it, expect } from 'vitest'
import { computeProfileCompleteness, PROFILE_FIELDS } from '../profile-completeness'

describe('computeProfileCompleteness', () => {
	it('is 0% for an empty profile', () => {
		const r = computeProfileCompleteness({})
		expect(r.percent).toBe(0)
		expect(r.isComplete).toBe(false)
		expect(r.missing).toHaveLength(PROFILE_FIELDS.length)
		expect(r.filled).toEqual([])
	})

	it('is 100% and complete when all fields are filled', () => {
		const r = computeProfileCompleteness({
			name: 'Jose', phone: '+34600', nationality: 'ES', address: 'Calle 1', passportId: 'AB1',
		})
		expect(r.percent).toBe(100)
		expect(r.isComplete).toBe(true)
		expect(r.missing).toEqual([])
	})

	it('rounds a partial profile and lists missing keys', () => {
		const r = computeProfileCompleteness({ name: 'Jose', phone: '+34600' })
		expect(r.percent).toBe(40) // 2 of 5
		expect(r.filled).toEqual(['name', 'phone'])
		expect(r.missing).toEqual(['nationality', 'address', 'passportId'])
	})

	it('treats whitespace-only and null as empty', () => {
		const r = computeProfileCompleteness({ name: '   ', phone: null, nationality: undefined })
		expect(r.percent).toBe(0)
	})
})
