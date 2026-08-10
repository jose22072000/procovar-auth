import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        server: {
            deps: {
                inline: ['server-only'],
            },
        },
        alias: {
            'server-only': path.resolve(__dirname, 'src/lib/__tests__/__mocks__/server-only.ts'),
            '@/lib/prisma': path.resolve(__dirname, 'src/lib/__tests__/__mocks__/prisma.ts'),
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
