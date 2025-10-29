/*
  Warnings:

  - You are about to drop the column `reference` on the `Transaction` table. All the data in the column will be lost.
  - The `source` column on the `Transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('STRIPE', 'BANK', 'INTERNAL', 'ADMIN_ADJUSTMENT');

-- DropIndex
DROP INDEX "public"."Transaction_reference_key";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "reference",
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
DROP COLUMN "source",
ADD COLUMN     "source" "TransactionSource" NOT NULL DEFAULT 'STRIPE';
