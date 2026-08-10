import { NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/lib/require-admin';
import { rotateKey } from '@/lib/jwks';
import { audit } from '@/lib/audit';

export async function POST() {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { kid } = await rotateKey();
    audit({ action: 'admin.jwks.rotate', userId: guard.user.id, meta: { kid } });
    return NextResponse.json({ kid });
}
