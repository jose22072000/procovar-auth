/**
 * POST /api/auth/refresh
 *
 * Refresh → par NUEVO, los dos tokens. El que se presenta queda gastado.
 *
 * Cuerpo: { refresh_token }   (`refresh` vale como alias de entrada)
 *
 * Respuestas:
 *   200 { token, refresh_token, token_type, expires_in, refresh_expires_in }
 *   400 { error: 'invalid_body' }
 *   401 { error: 'invalid_refresh' }
 *
 * ## Es lo primero que hace la APK al arrancar
 *
 * No se comprueba el acceso por su cuenta: dura 15 minutos, así que casi siempre
 * estará caducado al abrir la aplicación, y eso no significa que la sesión haya
 * muerto. Renovar hace las dos cosas a la vez — si el par sirve devuelve uno
 * nuevo, y si no, no sirve.
 *
 * ## Por qué todos los fallos son un 401 igual
 *
 * Del otro lado, el 401 es lo ÚNICO que significa "la sesión murió: limpia y a
 * la pantalla de acceso". Un token inventado, uno caducado, uno revocado y uno
 * robado acaban todos en lo mismo desde el aparato, así que distinguirlos en la
 * respuesta sólo le contaría a quien prueba tokens en qué estado están las
 * filas. Lo que sí queda distinguido es el registro: la reutilización se audita
 * como `auth.refresh.reuse` y se lleva por delante la cuenta entera.
 *
 * Y por lo mismo un fallo de red o un 5xx NO pueden salir como 401: el cliente
 * los trata distinto —conserva los tokens y reintenta— y un 401 por una caída
 * pasajera deja al logístico a pie con el trabajo del día dentro del teléfono.
 * Por eso el limitador de aquí NO cierra la puerta si Redis no contesta.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { CLIENTE_POR_DEFECTO, desdeDondePide, renovar } from '@/lib/apk-tokens';

const BodySchema = z
    .object({
        refresh_token: z.string().min(1).optional(),
        refresh: z.string().min(1).optional(),
    })
    .refine((b) => !!(b.refresh_token ?? b.refresh), { message: 'falta el refresh' });

export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const aparato = { ...desdeDondePide(req.headers), clientId: CLIENTE_POR_DEFECTO };

    // Un tope por IP, holgado: aquí la protección de verdad es el propio token, y
    // un aparato que recupera señal dispara su cola entera de golpe. Si el
    // limitador no contesta se sigue adelante — cerrar por eso sería un 401 con
    // forma de "sesión muerta" en plena calle.
    try {
        const rl = await rateLimit({
            scope: 'apk-refresh',
            identifier: aparato.ip ?? 'sin-ip',
            capacity: 120,
            refillPerSec: 2,
        });
        if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    } catch (e) {
        logger.warn('[auth/refresh] el limitador no contesta; se sigue', {
            error: (e as Error).message,
        });
    }

    try {
        const salida = await renovar((parsed.data.refresh_token ?? parsed.data.refresh)!, aparato);
        if (!salida.ok) {
            return NextResponse.json({ error: 'invalid_refresh' }, { status: 401 });
        }
        return NextResponse.json(salida.par);
    } catch (e) {
        logger.error('[auth/refresh] error', { error: (e as Error).message });
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
