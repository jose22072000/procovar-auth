import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

const BASE_URL = process.env.APP_URL || 'http://localhost:3500';

// Routes that require authentication
const PROTECTED_ROUTES = ["/profile", "/dashboard"];

/**
 * `?lang=en|es` pins the UI language. getRequestConfig cannot see searchParams,
 * so it reads the NEXT_LOCALE cookie instead. If `response` is a redirect, the
 * browser will re-request the destination, so mutating this request's cookies
 * has nothing left to render here — only the response Set-Cookie matters.
 * If `response` is a pass-through, we also mutate the request cookies and
 * rebuild NextResponse.next() with the mutated request headers so the current
 * request's server render (getTranslations) sees the new locale immediately,
 * instead of only self-correcting on the following request.
 */
function applyLangParam(
    request: NextRequest,
    response: NextResponse,
    isRedirect: boolean,
): NextResponse {
    const lang = request.nextUrl.searchParams.get("lang");
    if (!isLocale(lang)) return response;
    if (request.cookies.get(LOCALE_COOKIE)?.value === lang) return response;

    if (!isRedirect) {
        request.cookies.set(LOCALE_COOKIE, lang);
        response = NextResponse.next({ request: { headers: request.headers } });
    }

    response.cookies.set(LOCALE_COOKIE, lang, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });
    return response;
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isProtected = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    // In production, cookies have __Secure- prefix when useSecureCookies is true
    const cookieName = process.env.NODE_ENV === 'production'
        ? "__Secure-qb.session_token"
        : "qb.session_token";

    const sessionCookie = request.cookies.get(cookieName);

    if (isProtected && !sessionCookie) {
        // Get the full URL with search params to save as callback
        const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;

        // Create flow state with the callback URL
        const flowState = JSON.stringify({ origin: callbackUrl, redirectOrigin: true });

        // Redirect to home page with flow state cookie
        const response = NextResponse.redirect(new URL("/", BASE_URL));

        // Set the flow state cookie so we know where to redirect after login
        response.cookies.set("qb.flow_state", flowState, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        });

        return applyLangParam(request, response, true);
    }

    return applyLangParam(request, NextResponse.next(), false);
}

export const config = {
    // Widened from the two protected prefixes so `?lang=` works everywhere.
    // Static assets, API routes and the Next internals are excluded.
    matcher: ["/((?!api|health|_next/static|_next/image|favicon.ico|assets).*)"],
};
