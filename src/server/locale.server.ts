'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isLocale, LOCALE_COOKIE, type Locale } from '@/i18n/config'

/**
 * Persist the UI language in the `NEXT_LOCALE` cookie and refresh the route so
 * server-rendered text picks up the new bundle. `revalidatePath('/', 'layout')`
 * invalidates the whole tree — that is what qb-panel does too.
 */
export async function setLocale(locale: Locale): Promise<void> {
	if (!isLocale(locale)) return
	const cookieStore = await cookies()
	cookieStore.set(LOCALE_COOKIE, locale, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax',
	})
	revalidatePath('/', 'layout')
}
