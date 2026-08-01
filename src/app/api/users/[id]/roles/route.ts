import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionCan } from "@/lib/apiGuards";
import { getUserRoles, getUserPermissions } from "@/lib/rbac";
import { recordAudit, getRequestContext } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** GET /api/users/:id/roles — roles + permisos efectivos del usuario. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { ok } = await sessionCan("roles.read");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.read)" }, { status: 403 });

    const [roles, permissions] = await Promise.all([getUserRoles(id), getUserPermissions(id)]);
    return NextResponse.json({ userId: id, roles, permissions });
}

/**
 * POST /api/users/:id/roles — asigna uno o varios roles al usuario (multi-rol).
 * Body: { roleIds: string[], organizationId? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { ok, user } = await sessionCan("roles.manage");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.manage)" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const roleIds: string[] = Array.isArray(body?.roleIds) ? body.roleIds.map(String) : [];
    if (!roleIds.length) return NextResponse.json({ error: "roleIds es requerido" }, { status: 400 });

    await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({
            userId: id,
            roleId,
            organizationId: body?.organizationId ?? null,
        })),
        skipDuplicates: true,
    });

    const ctx = await getRequestContext();
    await recordAudit({
        action: "user.roles.assign",
        clientId: "auth",
        userId: user?.id ?? null,
        resource: `user:${id}`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { roleIds },
    });

    const roles = await getUserRoles(id);
    return NextResponse.json({ userId: id, roles });
}

/** DELETE /api/users/:id/roles?roleId=... — quita un rol al usuario. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { ok, user } = await sessionCan("roles.manage");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.manage)" }, { status: 403 });

    const roleId = new URL(req.url).searchParams.get("roleId");
    if (!roleId) return NextResponse.json({ error: "roleId es requerido" }, { status: 400 });

    await prisma.userRole.deleteMany({ where: { userId: id, roleId } });

    const ctx = await getRequestContext();
    await recordAudit({
        action: "user.roles.unassign",
        clientId: "auth",
        userId: user?.id ?? null,
        resource: `user:${id}`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { roleId },
    });
    return NextResponse.json({ ok: true });
}
