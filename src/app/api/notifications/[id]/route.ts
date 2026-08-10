/** GET /api/notifications/{id} — one notification, only if it is the session user's. */
import { NextResponse } from "next/server";
import { requireOwnedNotification } from "../_ownership";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const owned = await requireOwnedNotification(id);
    if (owned instanceof NextResponse) return owned;

    return NextResponse.json({ notification: owned });
}
