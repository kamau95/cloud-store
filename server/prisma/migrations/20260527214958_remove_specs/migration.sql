/*
  Warnings:

  - You are about to drop the column `specs` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the column `specs` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "specs";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "specs";
