import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

type Params = { params: Promise<{ orgId: string }> };

/**
 * Helper: extract Bearer token from Authorization header
 */
function getBearerToken(request: Request): string | null {
    const authHeader = request.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1] ?? null;
}

/**
 * Helper: check if request has a valid service Bearer token
 */
function isServiceAuth(request: Request): boolean {
    const token = getBearerToken(request);
    const expected = (process.env.BEARER_TOKEN) || '';
    return !!token && !!expected && token === expected;
}

/**
 * Helper to check if user is a member of the organization
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
 * /api/organizations/{orgId}:
 *   get:
 *     summary: Get organization details
 *     description: Get detailed information about an organization. Requires membership.
 *     tags:
 *       - Organizations
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
 *         description: Organization details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *                 currentUserRole:
 *                   type: string
 *                   enum: [owner, admin, member]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this organization
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request, { params }: Params) {
    try {
        const { orgId } = await params;

        // Support both session auth and service Bearer token
        if (isServiceAuth(request)) {
            const organization = await prisma.organization.findUnique({
                where: { id: orgId },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            members: true,
                            invitations: true,
                        },
                    },
                },
            });

            if (!organization) {
                return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
            }

            // For service auth, return owner as the role
            const ownerMember = organization.members.find((m) => m.role === 'owner');
            return NextResponse.json({
                organization,
                currentUserRole: ownerMember ? 'owner' : 'admin',
            });
        }

        const session = await auth.api.getSession({ headers: await headers() });
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const membership = await getMembership(session.user.id, orgId);
        
        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
        }

        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        members: true,
                        invitations: true,
                    },
                },
            },
        });

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        return NextResponse.json({ 
            organization,
            currentUserRole: membership.role,
        });
    } catch (error) {
        console.error('Failed to fetch organization:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/organizations/{orgId}:
 *   patch:
 *     summary: Update organization
 *     description: Update organization details. Requires admin or owner role.
 *     tags:
 *       - Organizations
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               logo:
 *                 type: string
 *                 nullable: true
 *               metadata:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Organization updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Slug already exists
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: Request, { params }: Params) {
    try {
        const { orgId } = await params;

        // Support both session auth and service Bearer token
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

        const body = await request.json();
        const { name, slug, logo, metadata } = body;

        // Check if new slug is taken by another org
        if (slug) {
            const existingOrg = await prisma.organization.findFirst({
                where: {
                    slug,
                    NOT: { id: orgId },
                },
            });

            if (existingOrg) {
                return NextResponse.json(
                    { error: 'Organization slug already exists' },
                    { status: 409 }
                );
            }
        }

        const organization = await prisma.organization.update({
            where: { id: orgId },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(logo !== undefined && { logo }),
                ...(metadata !== undefined && { metadata: metadata ? JSON.stringify(metadata) : null }),
            },
        });

        return NextResponse.json({ organization });
    } catch (error) {
        console.error('Failed to update organization:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/organizations/{orgId}:
 *   delete:
 *     summary: Delete organization
 *     description: Permanently delete an organization. Requires owner role.
 *     tags:
 *       - Organizations
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
 *         description: Organization deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only owners can delete organizations
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: Request, { params }: Params) {
    try {
        const { orgId } = await params;
        const session = await auth.api.getSession({ headers: await headers() });
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const membership = await getMembership(session.user.id, orgId);
        
        if (!membership || membership.role !== 'owner') {
            return NextResponse.json({ error: 'Only owners can delete organizations' }, { status: 403 });
        }

        await prisma.organization.delete({
            where: { id: orgId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete organization:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
