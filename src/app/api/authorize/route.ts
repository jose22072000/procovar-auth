import { NextRequest, NextResponse } from "next/server";
import { isValidServiceKey } from "@/lib/serviceAuth";
import { userHasPermission, getUserPermissions } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * POST /api/authorize — chequeo servidor-a-servidor de permisos (x-api-key).
 * Lo usan las apps para preguntar "¿este usuario puede X?".
 * Body: { userId, permission, organizationId? }  ->  { allowed, permissions }
 */
export async function POST(req: NextRequest) {
    if (!isValidServiceKey(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    if (!body?.userId || !body?.permission) {
        return NextResponse.json({ error: "userId y permission son requeridos" }, { status: 400 });
    }

    const [allowed, permissions] = await Promise.all([
        userHasPermission(String(body.userId), String(body.permission), body.organizationId ?? undefined),
        getUserPermissions(String(body.userId), body.organizationId ?? undefined),
    ]);

    return NextResponse.json({ allowed, permissions });
}
