/**
 * GET /api/health
 * Public. Returns Redis + DB health.
 */
import { NextResponse } from 'next/server';
import { pingRedis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const t0 = Date.now();
    const [redis, dbOk] = await Promise.all([
        pingRedis().catch((e) => ({ ok: false, latencyMs: 0, error: (e as Error).message })),
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ]);
    const ok = redis.ok && dbOk;
    return NextResponse.json(
        {
            ok,
            uptimeSec: Math.round(process.uptime()),
            latencyMs: Date.now() - t0,
            redis,
            db: { ok: dbOk },
        },
        { status: ok ? 200 : 503 }
    );
}
