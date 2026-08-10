import { prisma } from "@/lib/prisma";
import { resolveSessionUser } from "@/lib/require-admin";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/user/full-profile:
 *   get:
 *     summary: Get full user profile
 *     description: Returns detailed information about the authenticated user, including organizations and roles. Sensitive data is excluded.
 *     tags:
 *       - User
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 emailVerified:
 *                   type: boolean
 *                 image:
 *                   type: string
 *                   nullable: true
 *                 isSystemAdmin:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       role:
 *                         type: string
 *                       organizationId:
 *                         type: string
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
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       providerId:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
export async function GET() {
    try {
        const session = await resolveSessionUser();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                // User fields - no sensitive data
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                isSystemAdmin: true,
                createdAt: true,
                updatedAt: true,
                // Members with organizations
                members: {
                    select: {
                        id: true,
                        role: true,
                        organizationId: true,
                        createdAt: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                logo: true,
                                metadata: true,
                                createdAt: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                // Accounts - only non-sensitive fields
                accounts: {
                    select: {
                        id: true,
                        providerId: true,
                        // NOT including: password, accessToken, refreshToken, idToken
                    },
                },
                // Active subscription with plan details
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    select: {
                        id: true,
                        status: true,
                        billingCycle: true,
                        currentPeriodStart: true,
                        currentPeriodEnd: true,
                        createdAt: true,
                        plan: {
                            select: {
                                id: true,
                                key: true,
                                name: true,
                                description: true,
                                features: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                // NOT including sessions - contains tokens
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching full profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
