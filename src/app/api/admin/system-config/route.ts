/**
 * Admin: System configuration management.
 *
 * GET   /api/admin/system-config         → all key-value pairs
 * PATCH /api/admin/system-config         → set { key, value }
 *
 * Requires isSystemAdmin.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSystemAdmin } from '@/lib/require-admin';
import { getAllSystemConfig, setSystemConfig } from '@/lib/system-config';

const PatchSchema = z.object({
    key: z.string().min(1),
    value: z.string(),
});

export async function GET() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const config = await getAllSystemConfig();
    return NextResponse.json({ config });
}

export async function PATCH(req: NextRequest) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 });

    await setSystemConfig(parsed.data.key, parsed.data.value);
    return NextResponse.json({ ok: true });
}
