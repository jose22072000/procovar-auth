import 'server-only';
import { prisma } from './prisma';

let cache: { expires: number; data: Record<string, string> } | null = null;
const TTL_MS = 60_000;

async function loadAll(): Promise<Record<string, string>> {
    if (cache && cache.expires > Date.now()) return cache.data;
    const rows = await prisma.systemConfig.findMany();
    const data = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    cache = { expires: Date.now() + TTL_MS, data };
    return data;
}

export async function getSystemConfig(key: string, fallback?: string): Promise<string | undefined> {
    try {
        const data = await loadAll();
        return data[key] ?? fallback;
    } catch {
        return fallback;
    }
}

export async function setSystemConfig(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    cache = null;
}

export async function getAllSystemConfig(): Promise<Record<string, string>> {
    try {
        return await loadAll();
    } catch {
        return {};
    }
}

export function clampHoldMinutes(raw: string | number | null | undefined): number {
    if (raw == null) return 15;
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return 15;
    return Math.min(1440, Math.max(1, n));
}
