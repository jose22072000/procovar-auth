import { vi } from 'vitest'

// Mock for '@/lib/prisma' in test environment
export const prisma = {
    systemConfig: {
        findMany: vi.fn(async () => []),
        upsert: vi.fn(async () => ({})),
    },
    user: {
        findUnique: vi.fn(),
    },
    member: {
        findUnique: vi.fn(),
    },
};
