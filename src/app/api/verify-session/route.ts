import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRbac } from "@/rbac/resolve-permissions";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/verify-session:
 *   get:
 *     summary: Verify user session
 *     description: Checks if the request has a valid session cookie and returns the session, user info, and organization memberships.
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Valid session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     activeOrganizationId:
 *                       type: string
 *                       nullable: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                     image:
 *                       type: string
 *                       nullable: true
 *                     isSystemAdmin:
 *                       type: boolean
 *                 memberships:
 *                   type: array
 *                   description: User's organization memberships (empty array if none)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       roles:
 *                         type: array
 *                         description: Roles the user holds in this organization
 *                         items:
 *                           type: string
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Revocation check (authoritative). getSession honours its own cookie cache and
        // never inspects our custom `revokedAt` column, so a revoked session would stay
        // valid until natural expiry. Read the source-of-truth flag directly.
        const revocation = await prisma.session.findUnique({
            where: { id: session.session.id },
            select: { revokedAt: true },
        });
        if (revocation?.revokedAt) {
            return NextResponse.json({ error: "session_revoked" }, { status: 401 });
        }

        // Fetch user's organization memberships
        const memberRows = await prisma.member.findMany({
            where: { userId: session.user.id },
            select: {
                id: true,
                role: true,
                createdAt: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // `role` is internal only (better-auth stores roles comma-joined). Expose the
        // parsed `roles` array + the `organization` object; drop the redundant singular
        // `role` and `organizationId` (org.id covers it).
        const memberships = memberRows.map(({ role, ...m }) => ({
            ...m,
            roles: (role ?? '').split(',').map((r) => r.trim()).filter(Boolean),
        }));

        const rbac = await resolveRbac(session.user.id, session.session.activeOrganizationId ?? null);

        return NextResponse.json({
            ...session,
            memberships, // Empty array if user has no memberships
            rbac,
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
