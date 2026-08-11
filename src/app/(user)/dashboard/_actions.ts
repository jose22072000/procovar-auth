"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth.server";
import { revalidatePath } from "next/cache";
import { getSystemConfig, setSystemConfig, clampHoldMinutes } from "@/lib/system-config";
import { getRedis } from "@/lib/redis";
import { audit } from "@/lib/audit";

async function requireAdmin() {
    const { data: user } = await getCurrentUser();
    if (!user?.isSystemAdmin) throw new Error("No autorizado");
    return user;
}

export async function toggleUserAdmin(userId: string, makeAdmin: boolean): Promise<{ error?: string }> {
    try {
        const admin = await requireAdmin();
        if (admin.id === userId && !makeAdmin) return { error: "No puedes quitarte los permisos de admin" };
        await prisma.user.update({ where: { id: userId }, data: { isSystemAdmin: makeAdmin } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function toggleEmailVerified(userId: string, verified: boolean): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        await prisma.user.update({ where: { id: userId }, data: { emailVerified: verified } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function adminDeleteUser(userId: string): Promise<{ error?: string }> {
    try {
        const admin = await requireAdmin();
        if (admin.id === userId) return { error: "No puedes eliminar tu propia cuenta" };
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function getHoldMinutes(): Promise<number> {
    return clampHoldMinutes(await getSystemConfig("BOOKING_HOLD_MINUTES"));
}

export async function setHoldMinutes(minutes: number): Promise<{ ok: boolean; error?: string }> {
    try {
        await requireAdmin();
        const v = clampHoldMinutes(minutes);
        await setSystemConfig("BOOKING_HOLD_MINUTES", String(v));
        return { ok: true };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

export async function updateUserProfile(
    userId: string,
    data: { name?: string; phone?: string | null; nationality?: string | null; address?: string | null; passportId?: string | null },
): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        if (data.name !== undefined && data.name.trim() === "") return { error: "El nombre no puede estar vacío" };
        const patch: Record<string, unknown> = {};
        for (const k of ["name", "phone", "nationality", "address", "passportId"] as const) {
            if (k in data) patch[k] = data[k];
        }
        await prisma.user.update({ where: { id: userId }, data: patch });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function listUserSessions(
    userId: string,
): Promise<{ error?: string; sessions?: { id: string; ipAddress: string | null; userAgent: string | null; clientId: string | null; createdAt: string; expiresAt: string; revokedAt: string | null }[] }> {
    try {
        await requireAdmin();
        const rows = await prisma.session.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: { id: true, ipAddress: true, userAgent: true, clientId: true, createdAt: true, expiresAt: true, revokedAt: true },
        });
        return {
            sessions: rows.map((s) => ({
                id: s.id, ipAddress: s.ipAddress, userAgent: s.userAgent, clientId: s.clientId,
                createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(),
                revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
            })),
        };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function revokeUserSession(sessionId: string): Promise<{ error?: string }> {
    try {
        const admin = await requireAdmin();
        await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });

        const redis = getRedis("sessions");
        await redis.set(`session:revoked:${sessionId}`, "1", "EX", 60 * 60 * 24);

        audit({
            action: "session.revoke",
            userId: admin.id,
            meta: { sessionId, count: 1, via: "admin_dashboard" },
        });

        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function revokeAllUserSessions(userId: string): Promise<{ error?: string }> {
    try {
        const admin = await requireAdmin();
        const r = await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

        const ids = (await prisma.session.findMany({ where: { userId }, select: { id: true } })).map((s) => s.id);
        if (ids.length) {
            const redis = getRedis("sessions");
            const pipe = redis.pipeline();
            for (const id of ids) pipe.set(`session:revoked:${id}`, "1", "EX", 60 * 60 * 24);
            await pipe.exec();
        }

        audit({
            action: "session.revoke",
            userId: admin.id,
            meta: { targetUserId: userId, count: r.count, via: "admin_dashboard" },
        });

        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function removeOrgMember(memberId: string): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { error: "Miembro no encontrado" };
        if (member.role === "owner") {
            const owners = await prisma.member.count({ where: { organizationId: member.organizationId, role: "owner" } });
            if (owners <= 1) return { error: "No puedes quitar al último propietario de la organización" };
        }
        await prisma.member.delete({ where: { id: memberId } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function setOrgMemberRoles(memberId: string, roleIds: string[]): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { error: "Miembro no encontrado" };
        // El catálogo de roles es de toda Procovar: basta con que el rol exista.
        // Lo que ata a la persona a su sucursal es el miembro, no el rol.
        const valid = await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } });
        if (valid.length !== roleIds.length) return { error: "Rol inválido" };
        const existing = await prisma.memberRole.findMany({ where: { memberId }, select: { roleId: true } });
        const have = new Set(existing.map((r) => r.roleId));
        const want = new Set(roleIds);
        const toAdd = roleIds.filter((id) => !have.has(id));
        const toRemove = existing.filter((r) => !want.has(r.roleId)).map((r) => r.roleId);
        await prisma.$transaction([
            ...toAdd.map((roleId) => prisma.memberRole.create({ data: { memberId, roleId } })),
            ...(toRemove.length ? [prisma.memberRole.deleteMany({ where: { memberId, roleId: { in: toRemove } } })] : []),
        ]);
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function updateOrganizationAdmin(
    orgId: string,
    data: { name?: string; slug?: string; logo?: string | null },
): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        if (data.name !== undefined && data.name.trim() === "") return { error: "El nombre no puede estar vacío" };
        if (data.slug !== undefined && data.slug.trim() === "") return { error: "El slug no puede estar vacío" };
        const patch: Record<string, unknown> = {};
        for (const k of ["name", "slug", "logo"] as const) if (k in data) patch[k] = data[k];
        try {
            await prisma.organization.update({ where: { id: orgId }, data: patch });
        } catch (err) {
            if ((err as { code?: string }).code === "P2002") return { error: "Ese slug ya está en uso" };
            throw err;
        }
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function deleteOrganizationAdmin(orgId: string): Promise<{ error?: string }> {
    try {
        await requireAdmin();
        await prisma.organization.delete({ where: { id: orgId } });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}
