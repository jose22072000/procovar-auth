/**
 * Async, fire-and-forget audit logging.
 * Failures NEVER block the request — they are logged via winston.
 */
import { prisma } from './prisma';
import { logger } from './logger';

export interface AuditEvent {
    action: string;
    resource?: string | null;
    clientId?: string | null;
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    meta?: Record<string, unknown> | null;
}

export function audit(event: AuditEvent): void {
    prisma.auditLog
        .create({
            data: {
                action: event.action,
                resource: event.resource ?? null,
                clientId: event.clientId ?? null,
                userId: event.userId ?? null,
                ip: event.ip ?? null,
                ua: event.userAgent ?? null,
                meta: (event.meta ?? undefined) as object | undefined,
            },
        })
        .catch((e) => logger.warn('[audit] write failed', { error: (e as Error).message }));
}
