import { betterAuth } from "better-auth";
import { nextCookies } from 'better-auth/next-js';
import { organization } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        },
    },
    advanced: {
        cookiePrefix: 'procovar',
        useSecureCookies: process.env.NODE_ENV === 'production',
        crossSubDomainCookies: {
            enabled: true,
            domain: process.env.ROOT_DOMAIN || "localhost",
        },
    },
    experimental: { joins: true },
    plugins: [
        nextCookies(),
        organization(),
    ],
    user: {
        additionalFields: {
            isSystemAdmin: {
                type: "boolean",
                defaultValue: false,
            },
        },
    },
    session: {
        additionalFields: {
            clientId: {
                type: "string",
                required: false,
            },
            revokedAt: {
                type: "date",
                required: false,
            },
        },
    },
});
