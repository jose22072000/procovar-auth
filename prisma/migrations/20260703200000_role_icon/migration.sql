-- The Role.icon field was added to the schema without a migration, so the DB
-- `role` table lacks the column and every prisma.role query fails (P2022).
ALTER TABLE "role" ADD COLUMN IF NOT EXISTS "icon" TEXT;
