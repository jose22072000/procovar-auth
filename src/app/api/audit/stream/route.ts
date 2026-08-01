import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRedisSubscriber, AUDIT_CHANNEL } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/audit/stream — SSE en vivo de los eventos de auditoría (super-admin).
 * Lee el canal pub/sub de Redis y emite cada evento a los dashboards.
 */
export async function GET() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !(session.user as { isSystemAdmin?: boolean }).isSystemAdmin) {
        return new Response("Unauthorized", { status: 401 });
    }

    const sub = getRedisSubscriber();
    if (!sub) return new Response("Redis no configurado (REDIS_URL)", { status: 503 });
    await sub.subscribe(AUDIT_CHANNEL);

    const encoder = new TextEncoder();
    let onMessage: (channel: string, message: string) => void;
    let ping: ReturnType<typeof setInterval>;

    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(": connected\n\n"));
            onMessage = (channel, message) => {
                if (channel !== AUDIT_CHANNEL) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${message}\n\n`));
                } catch {
                    /* stream cerrado */
                }
            };
            sub.on("message", onMessage);
            ping = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(": ping\n\n"));
                } catch {
                    /* stream cerrado */
                }
            }, 25000);
        },
        cancel() {
            clearInterval(ping);
            if (onMessage) sub.off("message", onMessage);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
