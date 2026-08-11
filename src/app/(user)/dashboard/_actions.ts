"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth.server";
import { revalidatePath } from "next/cache";
import { getSystemConfig, setSystemConfig, clampHoldMinutes } from "@/lib/system-config";
import { getRedis } from "@/lib/redis";
import { audit } from "@/lib/audit";
import { altaPersona } from "@/lib/alta-persona";
import { resolveRbac } from "@/rbac/resolve-permissions";
import { can } from "@/rbac/can";
import { ungrantablePermissionKeys } from "@/rbac/grantable";
import { systemRolePermissionKeys } from "@/rbac/system-roles";

async function requireAdmin() {
    const { data: user } = await getCurrentUser();
    if (!user?.isSystemAdmin) throw new Error("No autorizado");
    return user;
}

/**
 * Quien pide esto, ¿puede hacerlo EN ESTA SUCURSAL?
 *
 * El Super Admin puede en todas. Cualquier otro solo en las suyas, y ni
 * siquiera en todas ellas: hace falta además el permiso concreto. Esto es lo
 * que impide que un Administrador de Camagüey toque la gente de Holguín
 * cambiando un identificador en la petición.
 */
async function exigirEnSucursal(organizationId: string, permiso: string) {
    const { data: user } = await getCurrentUser();
    if (!user) throw new Error("No autorizado");
    const rbac = await resolveRbac(user.id, organizationId);
    if (!can(rbac, permiso)) throw new Error("No puedes hacer esto en esta sucursal.");
    return user;
}

/**
 * Dar de alta a una persona en una sucursal, con su rol.
 *
 * Se crea con contraseña, no por invitación: ver el porqué en `altaPersona`.
 */
export async function anadirPersona(datos: {
    organizationId: string;
    nombre: string;
    usuario?: string;
    email?: string;
    password: string;
    roleId: string;
}): Promise<{ error?: string; yaExistia?: boolean }> {
    try {
        const actor = await exigirEnSucursal(datos.organizationId, "member.invite");

        // Nadie reparte un rol que no podría usar él mismo: si no, un
        // Administrador se asciende creando una segunda cuenta y entrando con
        // ella.
        const rol = await prisma.role.findUnique({
            where: { id: datos.roleId },
            select: { permissions: { select: { permission: { select: { key: true } } } } },
        });
        if (!rol) return { error: "Ese rol no existe." };
        const rbacActor = await resolveRbac(actor.id, datos.organizationId);
        const claves = rol.permissions
            .map((p) => p.permission?.key)
            .filter((k): k is string => Boolean(k));
        if (ungrantablePermissionKeys(rbacActor, claves).length) {
            return { error: "No puedes dar un rol con permisos que tú no tienes." };
        }

        const res = await altaPersona(datos);
        if (res.error) return { error: res.error };

        audit({
            action: "member.create",
            resource: res.memberId,
            userId: actor.id,
            meta: {
                sucursal: datos.organizationId,
                personaCreada: res.userId,
                cuentaNueva: !res.yaExistia,
            },
        });
        revalidatePath("/dashboard");
        return { yaExistia: res.yaExistia };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

/**
 * Devolverle a un rol los permisos que trae de fábrica.
 *
 * Hace falta porque el catálogo CRECE. Cuando se añade "exportar informes", los
 * roles que ya existían no lo tienen: la siembra solo pone permisos al crear un
 * rol, precisamente para no devolver en cada despliegue algo que alguien quitó
 * a propósito. Eso deja un hueco, y el hueco se nota como "a mí no me deja".
 *
 * Así que reponerlos es una acción de alguien, no un efecto de arrancar. Se ve
 * lo que va a pasar y se decide.
 */
export async function restablecerPermisosDelRol(roleId: string): Promise<{ error?: string; permisos?: number }> {
    try {
        const actor = await requireAdmin();
        const rol = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } });
        if (!rol) return { error: "Ese rol no existe." };

        const claves = systemRolePermissionKeys(rol.name);
        if (!claves.length) {
            return { error: `"${rol.name}" no es de los cinco de casa: no tiene permisos de fábrica que reponer.` };
        }

        const permisos = await prisma.permission.findMany({
            where: { key: { in: claves }, isDeprecated: false },
            select: { id: true },
        });
        await prisma.$transaction([
            prisma.rolePermission.deleteMany({ where: { roleId } }),
            prisma.rolePermission.createMany({
                data: permisos.map((p) => ({ roleId, permissionId: p.id })),
                skipDuplicates: true,
            }),
        ]);

        audit({
            action: "role.reset",
            resource: roleId,
            userId: actor.id,
            meta: { rol: rol.name, permisos: permisos.length },
        });
        revalidatePath("/dashboard/permissions");
        return { permisos: permisos.length };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function toggleUserAdmin(userId: string, makeAdmin: boolean): Promise<{ error?: string }> {
    try {
        const admin = await requireAdmin();
        if (admin.id === userId && !makeAdmin) return { error: "No puedes quitarte los permisos de admin" };
        await prisma.user.update({ where: { id: userId }, data: { isSystemAdmin: makeAdmin } });
        audit({ action: "user.admin", resource: userId, userId: admin.id, meta: { ahoraEsSuperAdmin: makeAdmin } });
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
        // El correo se lee ANTES de borrar: despues la fila ya no existe y el
        // apunte diria "se elimino la cuenta cmxyz...", que no sirve de nada.
        const victima = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        await prisma.user.delete({ where: { id: userId } });
        audit({ action: "user.delete", resource: userId, userId: admin.id, meta: { correo: victima?.email } });
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
        // Se lee el miembro ANTES de comprobar el permiso: hace falta saber de
        // que sucursal es para poder comprobar si quien pide manda en ella.
        const previo = await prisma.member.findUnique({
            where: { id: memberId },
            select: { organizationId: true },
        });
        if (!previo) return { error: "Miembro no encontrado" };
        const actor = await exigirEnSucursal(previo.organizationId, "member.remove");

        const member = await prisma.member.findUnique({
            where: { id: memberId },
            include: { user: { select: { email: true } }, organization: { select: { name: true } } },
        });
        if (!member) return { error: "Miembro no encontrado" };

        // No dejar una sucursal sin nadie que pueda administrarla: si se va el
        // ultimo Administrador, ya nadie de dentro puede dar de alta a nadie y
        // hay que venir a rescatarla desde fuera.
        if (member.role === "ADMINISTRADOR") {
            const cuantos = await prisma.member.count({
                where: { organizationId: member.organizationId, role: "ADMINISTRADOR" },
            });
            if (cuantos <= 1) {
                return { error: `${member.organization.name} se quedaria sin ningun Administrador. Nombra otro antes de quitar a este.` };
            }
        }

        await prisma.member.delete({ where: { id: memberId } });
        audit({
            action: "member.remove",
            resource: memberId,
            userId: actor.id,
            meta: { correo: member.user.email, sucursal: member.organization.name },
        });
        revalidatePath("/dashboard");
        return {};
    } catch (e) {
        return { error: (e as Error).message };
    }
}

export async function setOrgMemberRoles(memberId: string, roleIds: string[]): Promise<{ error?: string }> {
    try {
        const member = await prisma.member.findUnique({ where: { id: memberId } });
        if (!member) return { error: "Miembro no encontrado" };
        const actor = await exigirEnSucursal(member.organizationId, "member.assignRole");

        // El catálogo de roles es de toda Procovar: basta con que el rol exista.
        // Lo que ata a la persona a su sucursal es el miembro, no el rol.
        const valid = await prisma.role.findMany({
            where: { id: { in: roleIds } },
            select: { id: true, permissions: { select: { permission: { select: { key: true } } } } },
        });
        if (valid.length !== roleIds.length) return { error: "Rol inválido" };

        // Nadie reparte un rol que no podria usar el mismo. Sin esto, un
        // Administrador se asciende dandole Super Admin a una cuenta suya.
        const rbacActor = await resolveRbac(actor.id, member.organizationId);
        const claves = valid.flatMap((r) =>
            r.permissions.map((p) => p.permission?.key).filter((k): k is string => Boolean(k)),
        );
        if (ungrantablePermissionKeys(rbacActor, claves).length) {
            return { error: "No puedes dar un rol con permisos que tú no tienes." };
        }
        const existing = await prisma.memberRole.findMany({ where: { memberId }, select: { roleId: true } });
        const have = new Set(existing.map((r) => r.roleId));
        const want = new Set(roleIds);
        const toAdd = roleIds.filter((id) => !have.has(id));
        const toRemove = existing.filter((r) => !want.has(r.roleId)).map((r) => r.roleId);
        await prisma.$transaction([
            ...toAdd.map((roleId) => prisma.memberRole.create({ data: { memberId, roleId } })),
            ...(toRemove.length ? [prisma.memberRole.deleteMany({ where: { memberId, roleId: { in: toRemove } } })] : []),
        ]);
        audit({
            action: "member.roles",
            resource: memberId,
            userId: actor.id,
            meta: { roles: roleIds.length },
        });
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
