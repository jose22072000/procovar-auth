/** POST /api/notifications/{id}/unarchive — ownership-checked before the upstream call. */
import { NextResponse } from "next/server";
import { unarchive } from "@/lib/notify/inbox";
import { requireOwnedNotification } from "../../_ownership";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const owned = await requireOwnedNotification(id);
    if (owned instanceof NextResponse) return owned;

    const ok = await unarchive(id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
