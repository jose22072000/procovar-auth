import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_IDS = 200;

const getBearerToken = (request: Request) => {
    const authHeader = request.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
};

const getEnvBearerToken = () => (process.env.BEARER_TOKEN) || "";

type LookupBody = { ids?: unknown };

type LookupUser = { id: string; email: string; name: string };

/**
 * @swagger
 * /api/users/lookup:
 *   post:
 *     summary: Batch-resolve user ids to email/name
 *     description: >
 *       Backend-to-backend endpoint for turning a list of qb-auth user ids into
 *       human-readable identities (email + name). Used by qb-panel to label
 *       raw auth_user_ids (e.g. past-guest ids from qb-back) in pickers.
 *       Unknown ids are silently omitted from the response. Batch is capped at
 *       200 ids per request.
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 200
 *     responses:
 *       200:
 *         description: Resolved users (unknown ids omitted, order not guaranteed)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   email: { type: string }
 *                   name: { type: string }
 *       400:
 *         description: Invalid body (ids missing/not an array/non-string entries/too many ids)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function POST(request: Request) {
    try {
        const token = getBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const expectedToken = getEnvBearerToken();
        if (!expectedToken || token !== expectedToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: LookupBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        if (!Array.isArray(body.ids)) {
            return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
        }

        if (!body.ids.every((v) => typeof v === "string")) {
            return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
        }

        // Dedupe + drop blanks silently; this is a lookup, not a strict validator.
        const ids = Array.from(new Set(body.ids.map((v) => v.trim()).filter((v) => v.length > 0)));

        if (ids.length === 0) {
            return NextResponse.json([] satisfies LookupUser[]);
        }

        if (ids.length > MAX_IDS) {
            return NextResponse.json({ error: `Too many ids (max ${MAX_IDS})` }, { status: 400 });
        }

        const users = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, email: true, name: true },
        });

        return NextResponse.json(users satisfies LookupUser[]);
    } catch (error) {
        console.error("Error in batch user lookup:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
