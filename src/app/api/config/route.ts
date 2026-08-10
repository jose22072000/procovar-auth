/**
 * GET /api/config
 * Public (no auth required) — exposes non-sensitive runtime config to client components.
 */
import { NextResponse } from 'next/server';
import { getSystemConfig, clampHoldMinutes } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

export async function GET() {
    const bookingUrl = await getSystemConfig('QB_BOOKING_URL') ?? null;
    const holdMinutes = clampHoldMinutes(await getSystemConfig('BOOKING_HOLD_MINUTES'));
    return NextResponse.json({ bookingUrl, holdMinutes });
}
