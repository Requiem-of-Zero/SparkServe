-- CreateEnum
CREATE TYPE "TakeoutSessionStatus" AS ENUM ('OPEN', 'SUBMITTED', 'READY', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "RestaurantSettings" ALTER COLUMN "primaryColor" SET DEFAULT '#ff6a1a',
ALTER COLUMN "accentColor" SET DEFAULT '#ffd166',
ALTER COLUMN "backgroundColor" SET DEFAULT '#100b0b',
ALTER COLUMN "textColor" SET DEFAULT '#fff7ed';

-- CreateTable
CREATE TABLE "TakeoutSession" (
    "id" SERIAL NOT NULL,
    "publicToken" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "phone" TEXT,
    "status" "TakeoutSessionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakeoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TakeoutSessionItem" (
    "id" SERIAL NOT NULL,
    "takeoutSessionId" INTEGER NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakeoutSessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TakeoutSession_publicToken_key" ON "TakeoutSession"("publicToken");

-- CreateIndex
CREATE INDEX "TakeoutSession_userId_status_idx" ON "TakeoutSession"("userId", "status");

-- CreateIndex
CREATE INDEX "TakeoutSession_status_createdAt_idx" ON "TakeoutSession"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TakeoutSessionItem_menuItemId_idx" ON "TakeoutSessionItem"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TakeoutSessionItem_takeoutSessionId_menuItemId_key" ON "TakeoutSessionItem"("takeoutSessionId", "menuItemId");

-- AddForeignKey
ALTER TABLE "TakeoutSessionItem" ADD CONSTRAINT "TakeoutSessionItem_takeoutSessionId_fkey" FOREIGN KEY ("takeoutSessionId") REFERENCES "TakeoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakeoutSessionItem" ADD CONSTRAINT "TakeoutSessionItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
