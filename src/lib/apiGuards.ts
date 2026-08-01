import { headers } from "next/headers";
import { auth } from "./auth";
import { getUserPermissions } from "./rbac";
import { WILDCARD } from "./permissions";

type SessionUser = typeof auth.$Infer.Session.user;

/** Usuario de la sesión actual (o null). */
export async function getSessionUser(): Promise<SessionUser | null> {
    const s = await auth.api.getSession({ headers: await headers() });
    return s?.user ?? null;
}

/**
 * ¿La sesión actual puede ejecutar `permission`? El super-admin (isSystemAdmin) y
 * el comodín "*" pasan todo. Devuelve también el user para reusarlo.
 */
export async function sessionCan(
    permission: string,
): Promise<{ ok: boolean; user: SessionUser | null }> {
    const s = await auth.api.getSession({ headers: await headers() });
    const user = s?.user ?? null;
    if (!user) return { ok: false, user: null };
    if ((user as { isSystemAdmin?: boolean }).isSystemAdmin) return { ok: true, user };

    const orgId = (s?.session as { activeOrganizationId?: string } | undefined)?.activeOrganizationId;
    const perms = await getUserPermissions(user.id, orgId ?? undefined);
    return { ok: perms.includes(WILDCARD) || perms.includes(permission), user };
}
