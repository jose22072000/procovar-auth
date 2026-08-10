import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

type Params = { params: Promise<{ orgId: string; invitationId: string }> };

function getBearerToken(request: Request): string | null {
    const authHeader = request.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1] ?? null;
}

function isServiceAuth(request: Request): boolean {
    const token = getBearerToken(request);
    const expected = (process.env.BEARER_TOKEN) || '';
    return !!token && !!expected && token === expected;
}

/**
 * Helper to check membership and role
 */
async function getMembership(userId: string, orgId: string) {
    return prisma.member.findUnique({
        where: {
            userId_organizationId: {
                userId,
                organizationId: orgId,
            },
        },
    });
}

/**
 * @swagger
 * /api/organizations/{orgId}/invitations/{invitationId}:
 *   delete:
 *     summary: Cancel invitation
 *     description: Cancel a pending invitation. Requires admin or owner role.
 *     tags:
 *       - Invitations
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation canceled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Can only cancel pending invitations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invitation not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: Request, { params }: Params) {
    try {
        const { orgId, invitationId } = await params;

        if (!isServiceAuth(request)) {
            const session = await auth.api.getSession({ headers: await headers() });
            
            if (!session?.user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const membership = await getMembership(session.user.id, orgId);
            
            if (!membership || !['owner', 'admin'].includes(membership.role)) {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
            }
        }

        const invitation = await prisma.invitation.findUnique({
            where: { id: invitationId },
        });

        if (!invitation || invitation.organizationId !== orgId) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json(
                { error: 'Can only cancel pending invitations' },
                { status: 400 }
            );
        }

        await prisma.invitation.update({
            where: { id: invitationId },
            data: { status: 'canceled' },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to cancel invitation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/organizations/{orgId}/invitations/{invitationId}:
 *   post:
 *     summary: Resend invitation
 *     description: Extend expiration and resend invitation email. Requires admin or owner role.
 *     tags:
 *       - Invitations
 *     security:
 *       - CookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID
 *     responses:
 *       200:
 *         description: Invitation resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Can only resend pending invitations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Invitation not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request, { params }: Params) {
    try {
        const { orgId, invitationId } = await params;
        const session = await auth.api.getSession({ headers: await headers() });
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const membership = await getMembership(session.user.id, orgId);
        
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const invitation = await prisma.invitation.findUnique({
            where: { id: invitationId },
            include: {
                organization: true,
                inviter: true,
            },
        });

        if (!invitation || invitation.organizationId !== orgId) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json(
                { error: 'Can only resend pending invitations' },
                { status: 400 }
            );
        }

        // Extend expiration
        await prisma.invitation.update({
            where: { id: invitationId },
            data: {
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 more days
            },
        });

        // TODO: Resend invitation email
        // Note: We can't regenerate the token without knowing the original
        // In production, you might want to generate a new token here

        return NextResponse.json({ 
            success: true,
            message: 'Invitation expiration extended',
        });
    } catch (error) {
        console.error('Failed to resend invitation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
