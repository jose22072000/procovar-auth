import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionCan } from "@/lib/apiGuards";
import { recordAudit, getRequestContext } from "@/lib/audit";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

/** GET /api/roles?organizationId= — lista roles (globales + de la org). */
export async function GET(req: NextRequest) {
    const { ok } = await sessionCan("roles.read");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.read)" }, { status: 403 });

    const organizationId = new URL(req.url).searchParams.get("organizationId");
    const roles = await prisma.role.findMany({
        where: organizationId
            ? { OR: [{ organizationId }, { organizationId: null }] }
            : {},
        include: { _count: { select: { userRoles: true } } },
        orderBy: [{ organizationId: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ count: roles.length, roles });
}

/** POST /api/roles — crea un rol customizado { name, description?, organizationId?, permissions[] }. */
export async function POST(req: NextRequest) {
    const { ok, user } = await sessionCan("roles.manage");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.manage)" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body?.name) return NextResponse.json({ error: "name es requerido" }, { status: 400 });

    const slug = body.slug ? slugify(String(body.slug)) : slugify(String(body.name));
    const permissions: string[] = Array.isArray(body.permissions)
        ? [...new Set(body.permissions.map(String))]
        : [];

    try {
        const role = await prisma.role.create({
            data: {
                name: String(body.name),
                slug,
                description: body.description ?? null,
                organizationId: body.organizationId ?? null,
                permissions,
            },
        });
        const ctx = await getRequestContext();
        await recordAudit({
            action: "role.create",
            clientId: "auth",
            userId: user?.id ?? null,
            resource: `role:${role.id}`,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { name: role.name, permissions },
        });
        return NextResponse.json(role, { status: 201 });
    } catch (e) {
        return NextResponse.json(
            { error: `No se pudo crear el rol (¿slug duplicado?): ${(e as Error).message}` },
            { status: 400 },
        );
    }
}
