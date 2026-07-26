-- Controls whether customers can choose a structured spice level.
ALTER TABLE "MenuItem" ADD COLUMN "spicy" BOOLEAN NOT NULL DEFAULT false;
