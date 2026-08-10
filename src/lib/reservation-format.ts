const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$" };

export function currencySymbol(code: string): string {
	return SYMBOLS[code] ?? code;
}

export function formatStayDate(iso: string, locale = "es-ES"): string {
	return new Date(iso).toLocaleDateString(locale, {
		timeZone: "UTC",
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function nightsBetween(checkInIso: string, checkOutIso: string): number {
	const ms = new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
	return Math.max(0, Math.round(ms / 86_400_000));
}
