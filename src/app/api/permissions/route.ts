import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/apiGuards";
import { PERMISSION_CATALOG } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** GET /api/permissions — catálogo de permisos disponibles (para armar roles). */
export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ catalog: PERMISSION_CATALOG });
}
