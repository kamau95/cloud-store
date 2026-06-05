-- AlterEnum
ALTER TYPE "Provider" ADD VALUE 'API_KEY';

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "keyValue" TEXT NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "apiKeyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_apiKeyId_key" ON "Order"("apiKeyId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
