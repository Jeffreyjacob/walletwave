-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "expiredCheckoutSessionJobId" TEXT,
ALTER COLUMN "metadata" DROP NOT NULL;
