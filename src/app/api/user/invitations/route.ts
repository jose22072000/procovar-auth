import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * @swagger
 * /api/user/invitations:
 *   get:
 *     summary: Get pending invitations
 *     description: Get all pending invitations for the current user's email address
 *     tags:
 *       - User
 *     security:
 *       - CookieAuth: []
 *     responses:
 *       200:
 *         description: List of pending invitations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invitations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [member, admin]
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       organization:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           logo:
 *                             type: string
 *                             nullable: true
 *                       inviter:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           image:
 *                             type: string
 *                             nullable: true
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const invitations = await prisma.invitation.findMany({
            where: {
                email: {
                    equals: session.user.email,
                    mode: 'insensitive',
                },
                status: 'pending',
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                    },
                },
                inviter: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            invitations: invitations.map(inv => ({
                id: inv.id,
                role: inv.role,
                expiresAt: inv.expiresAt,
                createdAt: inv.createdAt,
                organization: inv.organization,
                inviter: inv.inviter,
            })),
            count: invitations.length,
        });
    } catch (error) {
        console.error('Failed to get user invitations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
