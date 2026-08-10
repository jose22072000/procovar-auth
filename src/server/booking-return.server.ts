"use server";

import {
    type BookingReturnParams,
} from "@/app/(base)/booking/_utils";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSessionCookieName } from "@/lib/flow-state";
import { createAuthCode } from "@/lib/auth-code";

/**
 * Server Action: generate a return URL for qb-booking.
 *
 * Called from the "Cambiar selección" button in the booking flow.
 * Returns the full URL to redirect the user back to the property page
 * in qb-booking with pre-filled selection, or null on failure.
 *
 * If the user has an active session at qb-auth, the URL goes through
 * qb-booking's /api/auth/callback?code=... so that qb-booking receives
 * the session token (sets qb.session_token cookie) before showing the
 * property page. Without this the Navbar would show "Iniciar sesión".
 */
export async function getBookingReturnUrl(
    params: BookingReturnParams
): Promise<string | null> {
    // Dónde vive la ficha de la propiedad para ESTE huésped.
    //
    // Antes era siempre QB_BOOKING_URL, la OTA. Quien empezaba su reserva en el
    // sitio propio del propietario (goodstay.es) pulsaba "Cambiar selección" y
    // aparecía en hostravel.com: otro sitio, otra marca, y la sensación de
    // haberse perdido. `returnOrigin` viaja firmado dentro del token de reserva
    // y sólo lo trae qb-back tras comprobarlo contra el dominio registrado de
    // la propiedad; _utils.ts vuelve a exigir que sea un origen https limpio
    // antes de dejarlo llegar hasta aquí.
    //
    // El fallback importa tanto como el caso nuevo: una reserva empezada en la
    // OTA no trae origen, y tiene que seguir volviendo a la OTA.
    const ownerOrigin = params.returnOrigin;
    const bookingBaseUrl = ownerOrigin || process.env.QB_BOOKING_URL;
    if (!bookingBaseUrl || !params.slug) return null;

    try {
        // Los sitios NO tienen la misma ficha ni los mismos parámetros, así que
        // no vale con cambiar el host y dejar la ruta igual.
        //
        //   OTA            hostravel.com/properties/<slug>?checkIn&checkOut&guests&rooms&…
        //   sitio propiedad <base>/disponibilidad?checkIn&checkOut&adults&children&pets&rooms
        //
        // `ownerOrigin` ya trae la base correcta para los dos casos que atiende
        // el sitio de propiedades, y por eso aquí no hay que distinguirlos:
        // `https://goodstay.es` cuando el propietario tiene dominio propio, y
        // `https://hostravel.net/<slug>` cuando no lo tiene y su sitio vive
        // bajo nuestro host. En el primero el slug no va en la URL porque ese
        // sitio resuelve la propiedad por el Host.
        //
        // Ese sitio lee `adults`, no `guests`, e ignora roomTypeId y rateId: no
        // tiene una ficha por tarifa a la que volver, vuelve al buscador de esa
        // propiedad con las fechas puestas.
        let propertyPath: string;
        if (ownerOrigin) {
            const qs = new URLSearchParams();
            qs.set("checkIn", params.checkIn);
            qs.set("checkOut", params.checkOut);
            qs.set("adults", String(params.guests));
            qs.set("rooms", String(params.rooms));
            if (params.children) qs.set("children", String(params.children));
            if (params.pets) qs.set("pets", "1");
            propertyPath = `/disponibilidad?${qs.toString()}`;
        } else {
            const qs = new URLSearchParams();
            qs.set("checkIn", params.checkIn);
            qs.set("checkOut", params.checkOut);
            qs.set("guests", String(params.guests));
            qs.set("rooms", String(params.rooms));
            if (params.children) qs.set("children", String(params.children));
            if (params.childrenAges?.length) qs.set("childrenAges", params.childrenAges.join(","));
            if (params.pets) qs.set("pets", "true");
            if (params.roomTypeId) qs.set("roomTypeId", params.roomTypeId);
            if (params.rateId) qs.set("rateId", params.rateId);
            propertyPath = `/properties/${params.slug}?${qs.toString()}`;
        }

        // En el dominio del propietario no hay traspaso de sesión, y no es una
        // carencia: la cookie de sesión está acotada a nuestro dominio y no
        // puede existir ahí, así que el código de autenticación no tendría nada
        // que entregar. Además su `/api/auth/callback` no está en la allowlist
        // de callbacks de qb-booking, de modo que pedirlo devolvería
        // `callback_not_allowed` y el botón dejaría de funcionar del todo.
        if (ownerOrigin) {
            return `${bookingBaseUrl}${propertyPath}`;
        }

        // If the user has an active session, route through qb-booking's auth
        // callback so it can set the qb.session_token cookie.
        const cookieStore = await cookies();
        const sessionCookieName = getSessionCookieName();
        const sessionToken = cookieStore.get(sessionCookieName)?.value;

        if (sessionToken) {
            const session = await auth.api.getSession({ headers: await headers() });
            if (session) {
                const callbackUrl = `${bookingBaseUrl}/api/auth/callback`;
                const { code } = await createAuthCode({
                    userId: session.user.id,
                    sessionId: session.session.id,
                    sessionToken,
                    clientId: "qb-booking",
                    callbackUrl,
                    returnTo: propertyPath,
                });
                const url = new URL(callbackUrl);
                url.searchParams.set("code", code);
                return url.toString();
            }
        }

        // Fallback: no active session, go directly to property page
        return `${bookingBaseUrl}${propertyPath}`;
    } catch {
        return null;
    }
}

/**
 * Server Action: generate the qb-booking home (search) URL.
 *
 * Used by the navbar "Buscar alojamientos" link in qb-auth.
 * If the user has an active session, passes auth code so qb-booking
 * receives the session token before landing on the requested path.
 */
export async function getBookingHomeUrl(returnTo = "/"): Promise<string | null> {
    const bookingBaseUrl = (process.env.QB_BOOKING_URL);
    if (!bookingBaseUrl) return null;

    try {
        const cookieStore = await cookies();
        const sessionCookieName = getSessionCookieName();
        const sessionToken = cookieStore.get(sessionCookieName)?.value;

        if (sessionToken) {
            const session = await auth.api.getSession({ headers: await headers() });
            if (session) {
                const callbackUrl = `${bookingBaseUrl}/api/auth/callback`;
                const { code } = await createAuthCode({
                    userId: session.user.id,
                    sessionId: session.session.id,
                    sessionToken,
                    clientId: "qb-booking",
                    callbackUrl,
                    returnTo,
                });
                const url = new URL(callbackUrl);
                url.searchParams.set("code", code);
                return url.toString();
            }
        }

        return `${bookingBaseUrl}${returnTo}`;
    } catch {
        return null;
    }
}
