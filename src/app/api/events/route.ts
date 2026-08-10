/**
 * GET /api/events — SSE proxy to qb-back's real-time event hub.
 *
 * The browser opens an EventSource here; we authenticate the session, verify the
 * viewer is a member of the requested organization, then stream qb-back's
 * `/api/events/stream?orgId=...` straight through. qb-back is trusted to fan out
 * only that org's events; membership is enforced here before proxying.
 */
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function backendUrl(): string | null {
	const url = process.env.QB_BACKEND_URL
	if (!url) return null
	// Server-side calls from inside Docker can't reach localhost — use the gateway.
	if (/localhost/.test(url)) return 'http://172.23.0.1:5100/api'
	return url
}

function bearer(): string {
	const token = process.env.BEARER_TOKEN ?? 'local-dev-bearer-token-00000000000000000000000000000'
	return `Bearer ${token}`
}

export async function GET(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() })
	const userId = session?.user?.id
	if (!userId) return new Response('Unauthorized', { status: 401 })

	const url = new URL(req.url)
	const orgId = url.searchParams.get('orgId') || (session?.session as { activeOrganizationId?: string } | undefined)?.activeOrganizationId

	// Sin organización, el stream es igual de válido: es el canal PERSONAL (la campana,
	// el estado de tus reservas). Un huésped no pertenece a ninguna organización, así que
	// exigir `orgId` era justo lo que le dejaba sin tiempo real.
	if (orgId) {
		const member = await prisma.member.findFirst({
			where: { userId, organizationId: orgId },
			select: { id: true },
		})
		if (!member) return new Response('Forbidden', { status: 403 })
	}

	const base = backendUrl()
	if (!base) return new Response('Backend not configured', { status: 500 })

	// El `userId` sale SIEMPRE de la sesión verificada, nunca de la query: es lo único
	// que impide que alguien escuche los eventos de otro cambiando un parámetro.
	const params = new URLSearchParams({ userId })
	if (orgId) params.set('orgId', orgId)

	const upstream = await fetch(`${base}/events/stream?${params.toString()}`, {
		headers: { Authorization: bearer(), Accept: 'text/event-stream' },
		signal: req.signal,
	})
	if (!upstream.ok || !upstream.body) {
		return new Response('Upstream error', { status: 502 })
	}

	return new Response(upstream.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			// Sin `Connection: keep-alive`: cabecera especifica de la conexion,
			// prohibida en HTTP/2 y HTTP/3 (RFC 9113 §8.2.2, RFC 9114 §4.2). El
			// navegador habla h3 con Cloudflare y el stream se caia con
			// ERR_QUIC_PROTOCOL_ERROR nada mas abrirse.
			'X-Accel-Buffering': 'no',
		},
	})
}
