import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { notifyOrganizationInvitation, humanizeExpirationDays } from '@/lib/notifications';

type Params = { params: Promise<{ orgId: string }> };

/** Single source of truth: drives both the DB expiry and the email copy. */
const INVITATION_EXPIRES_IN_DAYS = 7;

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
 * /api/organizations/{orgId}/invitations:
 *   get:
 *     summary: List organization invitations
 *     description: Get all invitations for an organization. Requires admin or owner role.
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
 *     responses:
 *       200:
 *         description: List of invitations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invitations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invitation'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request, { params }: Params) {
    try {
        const { orgId } = await params;

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

        const invitations = await prisma.invitation.findMany({
            where: { organizationId: orgId },
            include: {
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ invitations });
    } catch (error) {
        console.error('Failed to fetch invitations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/organizations/{orgId}/invitations:
 *   post:
 *     summary: Create invitation
 *     description: Send an invitation to join the organization. Requires admin or owner role.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to invite
 *               role:
 *                 type: string
 *                 enum: [admin, staff, agent]
 *                 default: agent
 *                 description: Role to assign when accepted
 *     responses:
 *       201:
 *         description: Invitation created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invitation:
 *                   $ref: '#/components/schemas/Invitation'
 *                 inviteUrl:
 *                   type: string
 *                   description: URL to accept the invitation
 *       400:
 *         description: Email is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: User already a member or invitation already sent
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request, { params }: Params) {
    try {
        const { orgId } = await params;
        let inviterId: string;

        if (isServiceAuth(request)) {
            // For service auth, get inviterId from the request body
            const owner = await prisma.member.findFirst({
                where: { organizationId: orgId, role: 'owner' },
            });
            inviterId = owner?.userId ?? 'system';
        } else {
            const session = await auth.api.getSession({ headers: await headers() });
            
            if (!session?.user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const membership = await getMembership(session.user.id, orgId);
            
            if (!membership || !['owner', 'admin'].includes(membership.role)) {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
            }

            // Validate role permissions
            const body_peek = await request.clone().json();
            if (membership.role !== 'owner' && body_peek.role === 'admin') {
                return NextResponse.json({ error: 'Only owners can invite admins' }, { status: 403 });
            }

            inviterId = session.user.id;
        }

        const body = await request.json();
        const { email, role = 'agent', roleId, propertyIds = [], scopeAllProperties = true } = body;

        let resolvedRoleId: string | null = null;
        if (roleId) {
            const r = await prisma.role.findFirst({ where: { id: roleId, organizationId: orgId }, select: { id: true } });
            if (!r) return NextResponse.json({ error: 'Invalid roleId' }, { status: 400 });
            resolvedRoleId = r.id;
        }

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Validate role — owner is never assigned via invitation
        const validInviteRoles = ['admin', 'staff', 'agent'];
        if (!validInviteRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Check if user is already a member
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            const existingMember = await getMembership(existingUser.id, orgId);
            if (existingMember) {
                return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
            }
        }

        // Check for existing pending invitation
        const existingInvitation = await prisma.invitation.findFirst({
            where: {
                organizationId: orgId,
                email,
                status: 'pending',
            },
        });

        if (existingInvitation) {
            return NextResponse.json(
                { error: 'Invitation already sent to this email' },
                { status: 409 }
            );
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const invitation = await prisma.invitation.create({
            data: {
                organizationId: orgId,
                email,
                role,
                status: 'pending',
                tokenHash,
                inviterId: inviterId,
                expiresAt: new Date(Date.now() + INVITATION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000),
                roleId: resolvedRoleId,
                propertyIds: scopeAllProperties ? [] : propertyIds,
                scopeAllProperties,
            },
            include: {
                organization: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Build invitation URL
        const baseUrl = process.env.APP_URL || 'http://localhost:3500';
        const invitationUrl = `${baseUrl}/invite?token=${token}`;

        // Send invitation email (fire and forget)
        const APP_NAME = process.env.APP_NAME || 'QuickBook';
        const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;
        const LOGO_URL = process.env.NOTIFY_LOGO_URL || undefined;
        const PRIMARY_COLOR = process.env.NOTIFY_PRIMARY_COLOR;

        notifyOrganizationInvitation({
            email,
            appName: APP_NAME,
            inviterName: invitation.inviter?.name || 'Someone',
            organizationName: invitation.organization.name,
            role,
            invitationUrl,
            expirationTime: humanizeExpirationDays(INVITATION_EXPIRES_IN_DAYS),
            supportEmail: SUPPORT_EMAIL,
            logoUrl: LOGO_URL,
            primaryColor: PRIMARY_COLOR,
        }).catch((err) => {
            console.error('Failed to send invitation email:', err);
        });

        return NextResponse.json({ 
            invitation,
            invitationUrl,
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to create invitation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
