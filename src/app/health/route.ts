/**
 * GET /health — Kubernetes liveness probe.
 * Plain 200 = the process is up. No dependency checks on purpose: a DB/Redis
 * blip must not fail liveness and get the pod killed. Readiness (Redis + DB)
 * lives at /api/health.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
}
