-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "displayedNetworkFee" DOUBLE PRECISION,
ADD COLUMN     "payoutTxid" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletAddress" TEXT;

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "credentialId" TEXT,
    "totalReceived" DOUBLE PRECISION NOT NULL,
    "hiddenAdminCut" DOUBLE PRECISION NOT NULL,
    "displayedNetworkFee" DOUBLE PRECISION NOT NULL,
    "sellerPayout" DOUBLE PRECISION NOT NULL,
    "sellerWallet" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payoutTxid" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payouts_orderId_key" ON "payouts"("orderId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
