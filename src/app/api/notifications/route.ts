/**
 * GET /api/notifications?filter=unread|all|archived&limit=&cursor=
 *
 * The browser NEVER sends a userId: it is read from the session here. Anything
 * else would let a user page through someone else's inbox, because the upstream
 * `GET /v1/inbox?userId=` accepts any id under our application key.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchInbox } from "@/lib/notify/inbox";
import { dropStaleHolds, isUnread, type InboxFilter, type InboxResponse } from "@/lib/notify/types";
import { requireSessionUserId } from "./_ownership";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
/** Wide enough to spot the confirm/cancel that supersedes a hold shown on this page. */
const CONTEXT_LIMIT = 100;

const parseFilter = (value: string | null): InboxFilter =>
    value === "unread" || value === "archived" ? value : "all";

export async function GET(request: NextRequest) {
    const userId = await requireSessionUserId();
    if (userId instanceof NextResponse) return userId;

    const { searchParams } = new URL(request.url);
    const filter = parseFilter(searchParams.get("filter"));
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const [page, context] = await Promise.all([
        fetchInbox({
            userId,
            limit,
            cursor,
            status: filter === "unread" ? "SENT" : undefined,
            archived: filter === "archived",
        }),
        // Also powers the badge, so it is fetched even when the page has no holds.
        fetchInbox({ userId, limit: CONTEXT_LIMIT }),
    ]);

    // The archived tab must show *only* archived items; the other tabs already
    // exclude them upstream, but we don't rely on that.
    const scoped =
        filter === "archived"
            ? page.data.filter((n) => n.archivedAt)
            : page.data.filter((n) => !n.archivedAt);

    const body: InboxResponse = {
        notifications: dropStaleHolds(scoped, [...context.data, ...page.data]),
        nextCursor: page.nextCursor,
        unreadCount: dropStaleHolds(context.data).filter(isUnread).length,
    };

    return NextResponse.json(body);
}
