-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStockLevel" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_key" ON "Inventory"("productId");

-- CreateIndex
CREATE INDEX "Inventory_currentStock_idx" ON "Inventory"("currentStock");

-- CreateIndex
CREATE INDEX "Inventory_minimumStockLevel_idx" ON "Inventory"("minimumStockLevel");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill inventory rows from existing product stock columns
INSERT INTO "Inventory" ("id", "productId", "currentStock", "minimumStockLevel", "updatedAt")
SELECT
  'inv_' || "id",
  "id",
  COALESCE("currentStock", 0),
  COALESCE("minimumStockLevel", 0),
  NOW()
FROM "Product";

-- Remove legacy indexes and columns from Product
DROP INDEX IF EXISTS "Product_currentStock_idx";
DROP INDEX IF EXISTS "Product_minimumStockLevel_idx";

ALTER TABLE "Product"
  DROP COLUMN "currentStock",
  DROP COLUMN "minimumStockLevel";
