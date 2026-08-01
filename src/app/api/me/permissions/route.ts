import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/apiGuards";
import { getUserRoles, getUserPermissions } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/permissions — roles + permisos efectivos del usuario logueado.
 * Lo consumen las apps (PEDIDO/delivery/analitics) para pintar/gatear la UI según
 * lo que el usuario puede hacer. Va con la cookie de sesión compartida.
 */
export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [roles, permissions] = await Promise.all([
        getUserRoles(user.id),
        getUserPermissions(user.id),
    ]);

    return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email },
        isSystemAdmin: (user as { isSystemAdmin?: boolean }).isSystemAdmin ?? false,
        roles,
        permissions,
    });
}
