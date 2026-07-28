import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// Monkey-patch for Better Auth if it expects PascalCase models
const models = ['user', 'session', 'account', 'verification', 'organization', 'member', 'invitation'];
for (const model of models) {
    // @ts-ignore
    if (prisma[model] && !prisma[model.charAt(0).toUpperCase() + model.slice(1)]) {
        // @ts-ignore
        prisma[model.charAt(0).toUpperCase() + model.slice(1)] = prisma[model];
    }
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
