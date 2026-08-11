/**
 * Cerrar la sesión.
 *
 * # Por qué esto ya no recorre las aplicaciones
 *
 * Antes iba paseando al usuario por CADA aplicación registrada, llamando a
 * `/api/logout/clear` en cada una para que borrase su cookie. Ninguna de las
 * aplicaciones de Procovar tiene ese endpoint: la primera de la lista
 * respondía 404 y la persona se quedaba tirada en una página con
 * `{"detail":"Not Found"}` — sin sesión cerrada y sin forma de volver.
 *
 * Ese paseo tenía sentido cuando el login ponía una cookie en el dominio de cada
 * aplicación y había que ir a borrarla a su casa. Aquí no pasa eso: cada
 * aplicación se guarda su propia sesión y la cierra ella, en su propio botón de
 * salir. Delivery, por ejemplo, borra su cookie y luego manda aquí.
 *
 * Así que aquí se hace lo único que le toca a este servicio: cerrar SU sesión y
 * devolver a la persona a donde venía. Si algún día una aplicación necesita que
 * la avisen, que declare su endpoint y se le llama a ella, no a todas.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { cookies, headers as nextHeaders } from 'next/headers';
import { auth } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { validateConsumerUrl } from '@/lib/consumer-allowlist';

const SELF_BASE = process.env.APP_URL || 'http://localhost:3500';

export async function GET(req: NextRequest) {
    const rawReturnTo = req.nextUrl.searchParams.get('returnTo');

    // El destino se comprueba contra la lista de aplicaciones registradas: sin
    // eso, cualquiera podría mandar a alguien a su servidor con un enlace de
    // "cerrar sesión" que sale de nuestro dominio.
    const validado = await validateConsumerUrl(rawReturnTo);
    const volverA = validado?.toString() ?? `${SELF_BASE}/`;

    try {
        const session = await auth.api.getSession({ headers: await nextHeaders() });
        if (session) {
            audit({
                action: 'auth.logout',
                userId: session.user.id,
                meta: { sessionId: session.session.id },
            });
        }
        await auth.api.signOut({ headers: await nextHeaders() }).catch(() => {});
    } catch (e) {
        // Que un fallo aquí no impida salir: quien le da al botón tiene que
        // acabar fuera, aunque el apunte de auditoría no llegue a escribirse.
        logger.warn('[logout] error al cerrar', { error: (e as Error).message });
    }

    const cookieStore = await cookies();
    cookieStore.delete('qb.flow_state');

    return NextResponse.redirect(volverA);
}
