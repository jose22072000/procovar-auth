/**
 * POST /api/auth/logout
 *
 * Cierra la sesión de UN aparato: revoca su cadena de refresh y la sesión de
 * better-auth que abrió.
 *
 * Cuerpo: { refresh_token }   (`refresh` vale como alias de entrada)
 * Respuesta: 200 { ok: true }, siempre.
 *
 * ## El refresh va en el cuerpo, no en la cabecera
 *
 * Es opaco: del token de acceso no se puede deducir cuál es. Y sigue siendo un
 * endpoint aparte porque el de emisión no revoca nada, sólo emite.
 *
 * ## Siempre 200
 *
 * Token que no existe, ya revocado, caducado: todos salen bien. Quien llama ya
 * ha decidido salir y borra lo suyo pase lo que pase; devolverle un error sólo
 * serviría para que un cliente escrupuloso dejara la sesión abierta por haber
 * perdido la red. De paso, no se le cuenta a nadie qué tokens existen.
 *
 * ## Cierra el aparato, NO la cuenta
 *
 * Quien cierra sesión en el teléfono no está diciendo que le hayan robado nada.
 * Cerrarle además la sesión web sería una sorpresa desagradable. La cuenta
 * entera sólo se cierra cuando un refresh vuelve — eso sí es un robo, y lo hace
 * `/api/auth/refresh`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { CLIENTE_POR_DEFECTO, cerrarSesionDelAparato, desdeDondePide } from '@/lib/apk-tokens';

const BodySchema = z.object({
    refresh_token: z.string().min(1).optional(),
    refresh: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        // Ni siquiera esto es un error: sin cuerpo no hay nada que revocar, pero
        // el cliente se va igual.
        return NextResponse.json({ ok: true });
    }
    const parsed = BodySchema.safeParse(body);
    const raw = parsed.success ? parsed.data.refresh_token ?? parsed.data.refresh : undefined;
    if (!raw) return NextResponse.json({ ok: true });

    try {
        await cerrarSesionDelAparato(raw, {
            ...desdeDondePide(req.headers),
            clientId: CLIENTE_POR_DEFECTO,
        });
    } catch (e) {
        // Que falle la base no puede impedir que el aparato se dé por fuera: el
        // refresh caduca solo, y dejar la sesión abierta en el teléfono porque el
        // servidor tuvo un mal momento es peor.
        logger.error('[auth/logout] no se pudo revocar', { error: (e as Error).message });
    }
    return NextResponse.json({ ok: true });
}
