/*
  Warnings:

  - You are about to drop the `payouts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_orderId_fkey";

-- DropForeignKey
ALTER TABLE "payouts" DROP CONSTRAINT "payouts_sellerId_fkey";

-- DropTable
DROP TABLE "payouts";
