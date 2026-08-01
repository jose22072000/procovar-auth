import Redis from "ioredis";
import { logger } from "./logger";

// Cliente Redis para el bus de EVENTOS de auditoría (opcional: si no hay REDIS_URL,
// todo sigue funcionando, solo que sin capa de tiempo real / buffer por día).
let client: Redis | null = null;
let subscriber: Redis | null = null;

export function getRedis(): Redis | null {
    if (!process.env.REDIS_URL) return null;
    if (!client) {
        client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
        client.on("error", (e) => logger.error("redis error", { error: e.message }));
    }
    return client;
}

/** Conexión separada para SUSCRIBIR (ioredis exige un cliente aparte para subscribe). */
export function getRedisSubscriber(): Redis | null {
    if (!process.env.REDIS_URL) return null;
    if (!subscriber) {
        subscriber = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
        subscriber.on("error", (e) => logger.error("redis sub error", { error: e.message }));
    }
    return subscriber;
}

export const AUDIT_CHANNEL = "audit:events";

/** Clave del stream del día: audit:day:YYYY-MM-DD (para saber qué pasó cada día). */
export function auditDayKey(date = new Date()): string {
    return `audit:day:${date.toISOString().slice(0, 10)}`;
}

const DAY_TTL_SECONDS = 45 * 24 * 60 * 60; // buffer reciente en Redis; el histórico permanente vive en Postgres

/**
 * Publica un evento de auditoría en Redis: (1) lo agrega al stream del DÍA y
 * (2) lo emite por el canal pub/sub para los dashboards en vivo (SSE).
 * Best-effort: si Redis no está o falla, no rompe nada.
 */
export async function publishAuditEvent(event: Record<string, unknown>): Promise<void> {
    const r = getRedis();
    if (!r) return;
    try {
        const payload = JSON.stringify(event);
        const dayKey = auditDayKey(new Date());
        await r.xadd(dayKey, "*", "data", payload);
        await r.expire(dayKey, DAY_TTL_SECONDS);
        await r.publish(AUDIT_CHANNEL, payload);
    } catch (e) {
        logger.error("publishAuditEvent failed", { error: (e as Error).message });
    }
}
