-- CreateTable
CREATE TABLE "tenant_domain" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "propertyId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domain_host_key" ON "tenant_domain"("host");

-- CreateIndex
CREATE INDEX "tenant_domain_clientId_idx" ON "tenant_domain"("clientId");
