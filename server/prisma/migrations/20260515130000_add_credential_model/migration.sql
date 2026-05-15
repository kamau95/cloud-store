-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "accessKey" TEXT,
    "secretKey" TEXT,
    "region" TEXT,
    "specs" JSONB,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "credentialId" TEXT;
ALTER TABLE "Order" DROP COLUMN "vaultCredPath";

-- CreateIndex
CREATE UNIQUE INDEX "Order_credentialId_key" ON "Order"("credentialId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
