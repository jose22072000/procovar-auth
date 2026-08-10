/**
 * Static i18n configuration shared by server and client.
 * Locale is selected by the `NEXT_LOCALE` cookie; defaults to `es`.
 */
export const locales = ['en', 'es'] as const
export type Locale = (typeof locales)[number]

/** qb-auth has always defaulted to Spanish; changing it would be a visible regression. */
export const defaultLocale: Locale = 'es'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const localeLabels: Record<Locale, string> = {
	en: 'English',
	es: 'Español',
}

export function isLocale(value: string | null | undefined): value is Locale {
	return value != null && (locales as readonly string[]).includes(value)
}
