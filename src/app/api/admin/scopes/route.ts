/**
 * Admin: read the scope catalog, presets and microservices map.
 * GET /api/admin/scopes
 */
import { NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/lib/require-admin';
import {
    SCOPES,
    PRESETS,
    MICROSERVICES,
    ROLE_RECOMMENDED_SCOPES,
} from '@/lib/scopes-catalog';

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    return NextResponse.json({
        scopes: SCOPES,
        presets: PRESETS,
        microservices: MICROSERVICES,
        roles: ROLE_RECOMMENDED_SCOPES,
    });
}
