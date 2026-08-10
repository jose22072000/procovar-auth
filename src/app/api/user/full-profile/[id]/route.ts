import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const getBearerToken = (request: Request) => {
    const authHeader = request.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
};

const getEnvBearerToken = () => (process.env.BEARER_TOKEN) || "";

/**
 * @swagger
 * /api/user/full-profile/{id}:
 *   get:
 *     summary: Get full user profile by id
 *     description: Returns detailed information about a user by id for backend-to-backend requests.
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile data
 *       400:
 *         description: Invalid user id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal Server Error
 */
export async function GET(request: Request, { params }: Params) {
    try {
        const token = getBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const expectedToken = getEnvBearerToken();
        if (!expectedToken || token !== expectedToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = typeof id === "string" ? id.trim() : "";
        if (!userId) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                isSystemAdmin: true,
                createdAt: true,
                updatedAt: true,
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
                    orderBy: { createdAt: "desc" },
                },
                accounts: {
                    select: {
                        id: true,
                        providerId: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching full profile by id:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
