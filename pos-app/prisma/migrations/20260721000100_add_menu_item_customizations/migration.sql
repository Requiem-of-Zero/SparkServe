-- Store customer-facing item customization snapshots for kitchen display.
ALTER TABLE "TableSessionItem" ADD COLUMN "removedIngredientIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "TakeoutSessionItem" ADD COLUMN "note" TEXT;
ALTER TABLE "TakeoutSessionItem" ADD COLUMN "removedIngredientIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
DROP INDEX "TakeoutSessionItem_takeoutSessionId_menuItemId_key";
CREATE INDEX "TakeoutSessionItem_takeoutSessionId_idx" ON "TakeoutSessionItem"("takeoutSessionId");

ALTER TABLE "OrderItem" ADD COLUMN "removedIngredientIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
