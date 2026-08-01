import { prisma } from "./prisma";
import { WILDCARD } from "./permissions";

export interface RoleSummary {
    id: string;
    name: string;
    slug: string;
    organizationId: string | null;
    permissions: string[];
}

/**
 * Roles asignados a un usuario. Si se pasa `organizationId`, incluye los roles de
 * esa organización + los globales (organizationId null); si no, todos sus roles.
 */
export async function getUserRoles(userId: string, organizationId?: string): Promise<RoleSummary[]> {
    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
    });

    const roles = userRoles
        .map((ur) => ur.role)
        .filter((r) =>
            organizationId === undefined
                ? true
                : r.organizationId === null || r.organizationId === organizationId,
        );

    return roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        organizationId: r.organizationId,
        permissions: r.permissions,
    }));
}

/**
 * Permisos EFECTIVOS de un usuario = unión de los permisos de TODOS sus roles.
 * Así, dándole varios roles, el usuario "compagina" lo que le falta.
 */
export async function getUserPermissions(userId: string, organizationId?: string): Promise<string[]> {
    const roles = await getUserRoles(userId, organizationId);
    const set = new Set<string>();
    for (const r of roles) for (const p of r.permissions) set.add(p);
    return [...set];
}

/** ¿El usuario tiene el permiso? El comodín "*" en cualquier rol concede todo. */
export async function userHasPermission(
    userId: string,
    permission: string,
    organizationId?: string,
): Promise<boolean> {
    const perms = await getUserPermissions(userId, organizationId);
    return perms.includes(WILDCARD) || perms.includes(permission);
}
