/**
 * POST /api/auth/revoke-session
 *
 * Marks a session as revoked (sets `revokedAt`) and pushes it to a Redis
 * revocation list so caches can be invalidated. Service-auth required.
 *
 * Body: { sessionId: string } OR { userId: string }  (revokes all)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withServiceAuth } from '@/lib/with-service-auth';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { audit } from '@/lib/audit';

const BodySchema = z
    .object({ sessionId: z.string().optional(), userId: z.string().optional() })
    .refine((d) => !!(d.sessionId || d.userId), { message: 'Provide sessionId or userId' });

export const POST = withServiceAuth(async (req: NextRequest, ctx) => {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const now = new Date();
    let count = 0;
    const ids: string[] = [];

    if (parsed.data.sessionId) {
        const r = await prisma.session.update({
            where: { id: parsed.data.sessionId },
            data: { revokedAt: now },
            select: { id: true },
        }).catch(() => null);
        if (r) { count = 1; ids.push(r.id); }
    } else if (parsed.data.userId) {
        const r = await prisma.session.updateMany({
            where: { userId: parsed.data.userId, revokedAt: null },
            data: { revokedAt: now },
        });
        count = r.count;
        const list = await prisma.session.findMany({ where: { userId: parsed.data.userId }, select: { id: true } });
        ids.push(...list.map((s) => s.id));
    }

    if (ids.length) {
        const redis = getRedis('sessions');
        const pipe = redis.pipeline();
        for (const id of ids) pipe.set(`session:revoked:${id}`, '1', 'EX', 60 * 60 * 24);
        await pipe.exec();
    }

    audit({
        action: 'session.revoke',
        clientId: ctx.client.clientId,
        userId: parsed.data.userId ?? null,
        meta: { sessionId: parsed.data.sessionId ?? null, count },
    });
    return NextResponse.json({ revoked: count });
}, { scopes: ['session:revoke'] });
