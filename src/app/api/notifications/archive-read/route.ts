/**
 * POST /api/notifications/archive-read — archives every read notification of the
 * session user. Bulk by userId, and that userId comes from the session, so there
 * is nothing a client could pass to touch another inbox.
 */
import { NextResponse } from "next/server";
import { archiveAllRead } from "@/lib/notify/inbox";
import { requireSessionUserId } from "../_ownership";

export const dynamic = "force-dynamic";

export async function POST() {
    const userId = await requireSessionUserId();
    if (userId instanceof NextResponse) return userId;

    const ok = await archiveAllRead(userId);
    return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
