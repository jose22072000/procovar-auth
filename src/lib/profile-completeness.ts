export type ProfileFieldKey = 'name' | 'phone' | 'nationality' | 'address' | 'passportId'

// Display strings (label/question/placeholder/why) live in the `myProfile.field.<key>`
// i18n namespace (messages/en.json, messages/es.json) — components look them up via
// `t('myProfile.field.' + f.key + '.label')` etc. This table only carries the stable
// key + icon, which is all the completeness math and rendering order need.
export const PROFILE_FIELDS: ReadonlyArray<{
	key: ProfileFieldKey
	icon: string
}> = [
	{ key: 'name', icon: 'lucide:user' },
	{ key: 'phone', icon: 'lucide:phone' },
	{ key: 'nationality', icon: 'lucide:globe' },
	{ key: 'address', icon: 'lucide:home' },
	{ key: 'passportId', icon: 'lucide:id-card' },
]

export interface ProfileCompleteness {
	percent: number
	filled: ProfileFieldKey[]
	missing: ProfileFieldKey[]
	isComplete: boolean
}

export function computeProfileCompleteness(
	user: Partial<Record<ProfileFieldKey, string | null | undefined>>,
): ProfileCompleteness {
	const filled: ProfileFieldKey[] = []
	const missing: ProfileFieldKey[] = []
	for (const f of PROFILE_FIELDS) {
		const v = (user[f.key] ?? '').toString().trim()
		if (v !== '') filled.push(f.key)
		else missing.push(f.key)
	}
	const percent = Math.round((filled.length / PROFILE_FIELDS.length) * 100)
	return { percent, filled, missing, isComplete: missing.length === 0 }
}
