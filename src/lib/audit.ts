import { headers, cookies } from "next/headers";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { publishAuditEvent } from "./redis";

export interface AuditEntry {
    userId?: string | null;
    organizationId?: string | null;
    clientId?: string | null;      // qué app: pedido | delivery | analitics | auth
    action: string;                // "sign-in", "sign-out", "order.create", ...
    resource?: string | null;
    status?: "success" | "failure";
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
}

/**
 * Contexto de la petición actual: de qué client viene (cookie de flujo qb.flow_state,
 * que las apps setean con su clientId al redirigir a auth) + ip y user-agent.
 */
export async function getRequestContext(): Promise<{
    clientId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
}> {
    let clientId: string | null = null;
    try {
        const raw = (await cookies()).get("qb.flow_state")?.value;
        if (raw) {
            const parsed = JSON.parse(raw) as { clientId?: string };
            clientId = parsed?.clientId ?? null;
        }
    } catch {
        // cookie ausente o no parseable: clientId queda null
    }

    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
        const h = await headers();
        ipAddress =
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            h.get("x-real-ip") ||
            null;
        userAgent = h.get("user-agent") || null;
    } catch {
        // fuera de contexto de request
    }

    return { clientId, ipAddress, userAgent };
}

/**
 * Escribe una entrada de auditoría. Best-effort: nunca rompe el flujo de auth.
 * Persiste en Postgres (histórico permanente, consultable por día) Y publica el
 * evento en Redis (stream del día + canal en vivo) para los dashboards.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
    let saved: { id: string; createdAt: Date } | null = null;
    try {
        saved = await prisma.auditLog.create({
            data: {
                userId: entry.userId ?? null,
                organizationId: entry.organizationId ?? null,
                clientId: entry.clientId ?? null,
                action: entry.action,
                resource: entry.resource ?? null,
                status: entry.status ?? "success",
                ipAddress: entry.ipAddress ?? null,
                userAgent: entry.userAgent ?? null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metadata: (entry.metadata ?? undefined) as any,
            },
            select: { id: true, createdAt: true },
        });
    } catch (e) {
        logger.error("audit record failed", {
            error: (e as Error).message,
            action: entry.action,
        });
    }

    // Evento a Redis (por día + canal en vivo). No bloquea si Redis no está.
    await publishAuditEvent({
        id: saved?.id,
        createdAt: (saved?.createdAt ?? new Date()).toISOString(),
        userId: entry.userId ?? null,
        clientId: entry.clientId ?? null,
        action: entry.action,
        resource: entry.resource ?? null,
        status: entry.status ?? "success",
        ipAddress: entry.ipAddress ?? null,
    });
}
