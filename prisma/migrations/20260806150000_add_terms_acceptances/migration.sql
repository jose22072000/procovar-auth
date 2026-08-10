-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "reservationId" TEXT,
    "termsVersion" TEXT NOT NULL,
    "documents" TEXT[],
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terms_acceptances_authUserId_idx" ON "terms_acceptances"("authUserId");

-- CreateIndex
CREATE INDEX "terms_acceptances_invoiceId_idx" ON "terms_acceptances"("invoiceId");
