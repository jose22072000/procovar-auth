/**
 * GET /api/service/tasas — las tasas de cambio por sucursal. Service-auth.
 *
 * # Para qué
 *
 * Para que todas las aplicaciones cobren con la MISMA. Antes cada una llevaba la suya:
 * PEDIDO la traía de Entrega y delivery tenía un campo donde alguien escribía un número a
 * mano en su pantalla de Configuración. Dos tasas para lo mismo se separan en cuanto una
 * de las dos se olvida, y entonces el mismo domicilio vale distinto según dónde se mire —
 * sin que nada falle: sale un importe creíble y cuadra mal en la caja.
 *
 * Es de SOLO LECTURA. El valor lo pone Entrega, que es quien lo mantiene.
 *
 * `?codigo=CAM` devuelve una; sin él, todas.
 *
 * Nunca se devuelve la tasa de otra sucursal como respaldo. Una conversión hecha con la
 * tasa de otra provincia es el error que más daño hace aquí: se lee bien, nadie lo
 * cuestiona, y aparece en la caja. Sin tasa se dice que falta y de cuál.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { withServiceAuth } from '@/lib/with-service-auth';
import { HORAS_FRESCA, refrescarSiHaceFalta, tasaDe, todasLasTasas } from '@/lib/tasa-cambio';

export const dynamic = 'force-dynamic';

export const GET = withServiceAuth(async (req: NextRequest) => {
    // Se dispara el refresco y NO se espera: quien pregunta quiere el número ya, y una
    // llamada a Entrega por consulta convierte cada lectura en dos.
    refrescarSiHaceFalta();

    const codigo = new URL(req.url).searchParams.get('codigo')?.trim();

    if (codigo) {
        const t = await tasaDe(codigo);

        if (!t) {
            return NextResponse.json(
                {
                    tasa: null,
                    codigo: codigo.toUpperCase(),
                    aviso: `sin tasa para ${codigo.toUpperCase()}`,
                },
                // 200 y no 404: que una sucursal no tenga tasa todavía es un estado
                // normal del sistema, no un error de quien pregunta. Con un 404, quien
                // llama lo trata como fallo y reintenta contra algo que no va a cambiar.
                { status: 200 },
            );
        }

        return NextResponse.json({
            ...t,
            horasFresca: HORAS_FRESCA,
            aviso: t.fresca
                ? null
                : `La tasa es del ${t.traidoAt.toLocaleDateString('es')} y puede estar desfasada.`,
        });
    }

    const todas = await todasLasTasas();

    return NextResponse.json({
        horasFresca: HORAS_FRESCA,
        tasas: todas.map((t) => ({
            ...t,
            aviso: t.fresca ? null : `del ${t.traidoAt.toLocaleDateString('es')}`,
        })),
    });
});

/**
 * POST /api/service/tasas — fuerza el refresco desde Entrega.
 *
 * El refresco normal va solo, en segundo plano, cuando lo guardado envejece. Esto es para
 * cuando alguien acaba de cambiar la tasa en Entrega y no quiere esperar.
 */
export const POST = withServiceAuth(async () => {
    const { refrescarTasas } = await import('@/lib/tasa-cambio');
    const r = await refrescarTasas();

    return NextResponse.json(r);
});
