/**
 * Ownership guard shared by every /api/notifications route.
 *
 * QB Notify's inbox API is scoped by *application*, not by user: our HMAC key
 * can read and mutate any notification of this app, and `GET /v1/inbox?userId=`
 * happily accepts whatever userId it is given. So the two rules below are the
 * only thing standing between a user and someone else's inbox:
 *
 *  1. the userId always comes from the server-side session, never from the request;
 *  2. before touching a notification by id, we fetch it and check that it is the
 *     session user's — otherwise 403.
 */
import { NextResponse } from "next/server";
import { resolveSessionUser } from "@/lib/require-admin";
import { fetchNotification } from "@/lib/notify/inbox";
import type { InboxNotification } from "@/lib/notify/types";

/** The authenticated user id, or a 401 response. Never trusts the request body/query. */
export async function requireSessionUserId(): Promise<string | NextResponse> {
    const resolved = await resolveSessionUser();
    if (!resolved?.user?.id) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return resolved.user.id;
}

/** The notification with `id`, but only if it belongs to the session user. */
export async function requireOwnedNotification(
    id: string,
): Promise<InboxNotification | NextResponse> {
    const userId = await requireSessionUserId();
    if (userId instanceof NextResponse) return userId;

    const notification = await fetchNotification(id);
    if (!notification) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (notification.recipientUserId !== userId) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return notification;
}
