/**
 * next-intl request config: reads the locale from the NEXT_LOCALE cookie
 * (set by the `setLocale` server action, or by src/proxy.ts from `?lang=`)
 * and loads the matching messages bundle.
 */
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config'

export default getRequestConfig(async () => {
	const cookieStore = await cookies()
	const raw = cookieStore.get(LOCALE_COOKIE)?.value
	const locale: Locale = isLocale(raw) ? raw : defaultLocale

	const messages = (await import(`../../messages/${locale}.json`)).default

	return { locale, messages }
})
