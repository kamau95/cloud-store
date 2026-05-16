-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cryptoAddress" TEXT,
ADD COLUMN     "cryptoAmount" DOUBLE PRECISION,
ADD COLUMN     "cryptoCurrency" TEXT,
ADD COLUMN     "cryptoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "cryptoNetwork" TEXT;
