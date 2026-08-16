/**
 * GET /api/flow/olvidar — tirar el rastro del login que quedó a medias.
 *
 * Quien escribe auth.procovar.cloud a mano quiere entrar EN auth. Si antes había
 * empezado a entrar en Rutas y lo dejó, la galleta de flujo sigue ahí media hora y el
 * login la obedece: entras y te manda a Rutas.
 *
 * Vive en una ruta y no en la propia pantalla porque Next solo deja escribir galletas
 * desde una acción de servidor o un manejador de ruta; borrarla al pintar revienta
 * con un 500.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE_URL = process.env.APP_URL || 'http://localhost:3500';

export async function GET() {
    const cookieStore = await cookies();
    cookieStore.delete('qb.flow_state');
    return NextResponse.redirect(new URL('/', BASE_URL));
}
