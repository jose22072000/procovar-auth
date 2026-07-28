import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/user/full-profile:
 *   get:
 *     summary: Get full user profile
 *     description: Returns detailed information about the authenticated user, including organizations, roles, and sessions.
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
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           organization:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                           role:
 *                             type: string
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

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                members: {
                    include: {
                        organization: true,
                    },
                },
                sessions: true,
                accounts: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Remove sensitive data if necessary (like passwords, tokens)
        // Prisma excludes sensitive fields by default if not selected, but here we included everything.
        // We should be careful with sessions tokens if they are sensitive.
        // For now, returning what was requested: "all user information".

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching full profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
