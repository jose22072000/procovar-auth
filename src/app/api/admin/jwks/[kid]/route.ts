import { NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/lib/require-admin';
import { revokeKey } from '@/lib/jwks';
import { audit } from '@/lib/audit';

export async function DELETE(_req: Request, { params }: { params: Promise<{ kid: string }> }) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { kid } = await params;
    await revokeKey(kid).catch(() => null);
    audit({ action: 'admin.jwks.revoke', userId: guard.user.id, meta: { kid } });
    return NextResponse.json({ ok: true });
}
