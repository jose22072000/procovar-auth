/**
 * Admin: Revoke an API key.
 * DELETE /api/admin/api-keys/:id
 */
import { NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/api-key';
import { requireSystemAdmin } from '@/lib/require-admin';
import { audit } from '@/lib/audit';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;
    const { id } = await params;
    await revokeApiKey(id).catch(() => null);
    audit({ action: 'admin.apikey.revoke', userId: guard.user.id, meta: { apiKeyId: id } });
    return NextResponse.json({ ok: true });
}
