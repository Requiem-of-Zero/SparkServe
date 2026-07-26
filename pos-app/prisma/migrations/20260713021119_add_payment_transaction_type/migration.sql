-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('DINE_IN', 'TAKEOUT');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "transactionType" "PaymentTransactionType" NOT NULL DEFAULT 'DINE_IN';

-- CreateIndex
CREATE INDEX "Payment_transactionType_status_idx" ON "Payment"("transactionType", "status");
