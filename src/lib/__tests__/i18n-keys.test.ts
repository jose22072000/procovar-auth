import { describe, it, expect } from 'vitest'
import { flattenKeys, diffMessageKeys } from '../i18n-keys'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'

describe('flattenKeys', () => {
	it('flattens nested objects to dotted paths', () => {
		expect(flattenKeys({ nav: { about: 'About' }, lang: { en: 'English' } })).toEqual([
			'nav.about',
			'lang.en',
		])
	})

	it('returns an empty list for an empty object', () => {
		expect(flattenKeys({})).toEqual([])
	})
})

describe('diffMessageKeys', () => {
	it('reports keys missing on each side', () => {
		const a = { nav: { about: 'About', contact: 'Contact' } }
		const b = { nav: { about: 'Acerca de' }, extra: { x: 'x' } }
		expect(diffMessageKeys(a, b)).toEqual({
			missingInB: ['nav.contact'],
			missingInA: ['extra.x'],
		})
	})
})

describe('the real message bundles', () => {
	it('es has exactly the same keys as en', () => {
		const { missingInB, missingInA } = diffMessageKeys(
			en as Record<string, unknown>,
			es as Record<string, unknown>,
		)
		expect({ missingInEs: missingInB, missingInEn: missingInA }).toEqual({
			missingInEs: [],
			missingInEn: [],
		})
	})
})
