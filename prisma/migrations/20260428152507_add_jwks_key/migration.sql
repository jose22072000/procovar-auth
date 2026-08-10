-- CreateTable
CREATE TABLE "jwks_key" (
    "id" TEXT NOT NULL,
    "kid" TEXT NOT NULL,
    "alg" TEXT NOT NULL DEFAULT 'RS256',
    "publicPem" TEXT NOT NULL,
    "privatePem" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jwks_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jwks_key_kid_key" ON "jwks_key"("kid");

-- CreateIndex
CREATE INDEX "jwks_key_active_revokedAt_idx" ON "jwks_key"("active", "revokedAt");
