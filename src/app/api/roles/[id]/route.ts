import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionCan } from "@/lib/apiGuards";
import { recordAudit, getRequestContext } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** PATCH /api/roles/:id — edita nombre/descripcion/permisos del rol. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { ok, user } = await sessionCan("roles.manage");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.manage)" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.description !== undefined) data.description = body.description ?? null;
    if (Array.isArray(body.permissions)) data.permissions = [...new Set(body.permissions.map(String))];

    const role = await prisma.role.update({ where: { id }, data });

    const ctx = await getRequestContext();
    await recordAudit({
        action: "role.update",
        clientId: "auth",
        userId: user?.id ?? null,
        resource: `role:${id}`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: data,
    });
    return NextResponse.json(role);
}

/** DELETE /api/roles/:id — elimina un rol (no si es del sistema). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { ok, user } = await sessionCan("roles.manage");
    if (!ok) return NextResponse.json({ error: "Sin permiso (roles.manage)" }, { status: 403 });

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (role.isSystem) return NextResponse.json({ error: "No se puede borrar un rol del sistema" }, { status: 400 });

    await prisma.role.delete({ where: { id } });

    const ctx = await getRequestContext();
    await recordAudit({
        action: "role.delete",
        clientId: "auth",
        userId: user?.id ?? null,
        resource: `role:${id}`,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { name: role.name },
    });
    return NextResponse.json({ ok: true });
}
