/** Flattens a nested message object into dotted key paths, e.g. `nav.about`. */
export function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
	const keys: string[] = []
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			keys.push(...flattenKeys(value as Record<string, unknown>, path))
		} else {
			keys.push(path)
		}
	}
	return keys
}

export interface MessageKeyDiff {
	/** Keys present in `a` but absent from `b`. */
	missingInB: string[]
	/** Keys present in `b` but absent from `a`. */
	missingInA: string[]
}

/**
 * next-intl does not type-check that every locale bundle carries every key, and
 * the old `t: typeof translations.en` cast hid the same gap. This is the guard.
 */
export function diffMessageKeys(
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): MessageKeyDiff {
	const ka = flattenKeys(a)
	const kb = flattenKeys(b)
	const sa = new Set(ka)
	const sb = new Set(kb)
	return {
		missingInB: ka.filter((k) => !sb.has(k)),
		missingInA: kb.filter((k) => !sa.has(k)),
	}
}
