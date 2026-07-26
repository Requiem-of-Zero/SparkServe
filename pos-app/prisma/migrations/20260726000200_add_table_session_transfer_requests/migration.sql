-- CreateEnum
CREATE TYPE "TableSessionTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TableSessionTransferRequest" (
    "id" SERIAL NOT NULL,
    "tableSessionId" INTEGER NOT NULL,
    "requestedByEmployeeId" INTEGER NOT NULL,
    "reviewedByEmployeeId" INTEGER,
    "fromTableId" INTEGER NOT NULL,
    "toTableId" INTEGER NOT NULL,
    "status" "TableSessionTransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "TableSessionTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableSessionTransferRequest_status_createdAt_idx" ON "TableSessionTransferRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TableSessionTransferRequest_tableSessionId_status_idx" ON "TableSessionTransferRequest"("tableSessionId", "status");

-- CreateIndex
CREATE INDEX "TableSessionTransferRequest_requestedByEmployeeId_createdAt_idx" ON "TableSessionTransferRequest"("requestedByEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "TableSessionTransferRequest_reviewedByEmployeeId_createdAt_idx" ON "TableSessionTransferRequest"("reviewedByEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "TableSessionTransferRequest_toTableId_status_idx" ON "TableSessionTransferRequest"("toTableId", "status");

-- AddForeignKey
ALTER TABLE "TableSessionTransferRequest" ADD CONSTRAINT "TableSessionTransferRequest_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSessionTransferRequest" ADD CONSTRAINT "TableSessionTransferRequest_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSessionTransferRequest" ADD CONSTRAINT "TableSessionTransferRequest_reviewedByEmployeeId_fkey" FOREIGN KEY ("reviewedByEmployeeId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSessionTransferRequest" ADD CONSTRAINT "TableSessionTransferRequest_fromTableId_fkey" FOREIGN KEY ("fromTableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSessionTransferRequest" ADD CONSTRAINT "TableSessionTransferRequest_toTableId_fkey" FOREIGN KEY ("toTableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
