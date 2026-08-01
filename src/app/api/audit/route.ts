import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidServiceKey } from "@/lib/serviceAuth";
import { recordAudit } from "@/lib/audit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * POST /api/audit — una app conectada registra una acción de un usuario.
 * Auth: header `x-api-key` (SERVICE_API_KEY). Sin sesión de usuario.
 *
 * Body: { clientId, action, userId?, organizationId?, resource?, status?, metadata? }
 * `clientId` = qué app (pedido | delivery | analitics …). Es lo que responde
 * "en dónde lo hizo el usuario".
 */
export async function POST(req: NextRequest) {
    if (!isValidServiceKey(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.action || !body.clientId) {
        return NextResponse.json({ error: "clientId y action son requeridos" }, { status: 400 });
    }

    const ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null;
    const userAgent = req.headers.get("user-agent") || null;

    await recordAudit({
        userId: body.userId ?? null,
        organizationId: body.organizationId ?? null,
        clientId: String(body.clientId),
        action: String(body.action),
        resource: body.resource ?? null,
        status: body.status === "failure" ? "failure" : "success",
        ipAddress: body.ipAddress ?? ipAddress,
        userAgent: body.userAgent ?? userAgent,
        metadata: body.metadata,
    });

    return NextResponse.json({ ok: true });
}

/**
 * GET /api/audit — consulta de la auditoría. Solo super-admin (isSystemAdmin).
 * Query: clientId, userId, action, limit (default 100, máx 500).
 */
export async function GET(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // El campo isSystemAdmin es un additionalField del usuario.
    if (!(session.user as { isSystemAdmin?: boolean }).isSystemAdmin) {
        return NextResponse.json({ error: "Solo super-admin" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    // Filtro por DÍA (day=YYYY-MM-DD) o por rango (from / to). Así el super-admin ve
    // "qué hizo cada quién en cada client app" por día.
    const day = searchParams.get("day"); // YYYY-MM-DD
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    let createdAt: { gte?: Date; lte?: Date } | undefined;
    if (day) {
        const start = new Date(`${day}T00:00:00.000Z`);
        const end = new Date(`${day}T23:59:59.999Z`);
        createdAt = { gte: start, lte: end };
    } else if (from || to) {
        createdAt = {};
        if (from) createdAt.gte = new Date(from);
        if (to) createdAt.lte = new Date(to);
    }

    const logs = await prisma.auditLog.findMany({
        where: {
            ...(clientId ? { clientId } : {}),
            ...(userId ? { userId } : {}),
            ...(action ? { action } : {}),
            ...(createdAt ? { createdAt } : {}),
        },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    return NextResponse.json({ count: logs.length, logs });
}
