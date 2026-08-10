import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSystemAdmin } from '@/lib/require-admin';
import { deriveSigningKey } from '@/lib/service-auth';
import { audit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
    const guard = await requireSystemAdmin();
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const client = await prisma.clientApp.findUnique({
        where: { id },
        select: { clientId: true, signingKeyVersion: true },
    });
    if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const signingKey = deriveSigningKey(client.clientId, client.signingKeyVersion);
    audit({ action: 'admin.client.reveal_signing_key', userId: guard.user.id, meta: { clientId: client.clientId } });

    return NextResponse.json({ signingKey });
}
