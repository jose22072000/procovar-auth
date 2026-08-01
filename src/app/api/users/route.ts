import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionCan } from "@/lib/apiGuards";

export const dynamic = "force-dynamic";

/** GET /api/users — usuarios con sus roles (para asignar roles). Requiere users.read. */
export async function GET() {
    const { ok } = await sessionCan("users.read");
    if (!ok) return NextResponse.json({ error: "Sin permiso (users.read)" }, { status: 403 });

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            isSystemAdmin: true,
            createdAt: true,
            userRoles: { include: { role: { select: { id: true, name: true, slug: true } } } },
        },
        orderBy: { createdAt: "desc" },
    });

    const shaped = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isSystemAdmin: u.isSystemAdmin,
        createdAt: u.createdAt,
        roles: u.userRoles.map((ur) => ur.role),
    }));

    return NextResponse.json({ count: shaped.length, users: shaped });
}
