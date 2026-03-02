-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'SALE', 'CONSUMPTION', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ClientPackageStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SaleItemType" AS ENUM ('PRODUCT', 'SERVICE', 'PACKAGE');

-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('RENT', 'SALARY', 'MARKETING', 'SUPPLIES', 'OTHER');
ALTER TABLE "Expense" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING (
  CASE "category"::text
    WHEN 'RENT' THEN 'RENT'
    WHEN 'MARKETING' THEN 'MARKETING'
    WHEN 'MATERIAL' THEN 'SUPPLIES'
    WHEN 'EQUIPMENT' THEN 'SUPPLIES'
    WHEN 'OTHER' THEN 'OTHER'
    ELSE 'OTHER'
  END::"ExpenseCategory_new"
);
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ProductSale" DROP CONSTRAINT "ProductSale_productId_fkey";

-- DropIndex
DROP INDEX "Product_active_idx";

-- DropIndex
DROP INDEX "Product_name_key";

-- DropIndex
DROP INDEX "Service_category_idx";

-- AlterTable
ALTER TABLE "Expense"
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Expense"
DROP COLUMN "description",
DROP COLUMN "recurring";

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN     "averagePurchasePrice" DECIMAL(10,2),
ADD COLUMN     "currentStock" INTEGER,
ADD COLUMN     "minimumStockLevel" INTEGER,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DataMigration
UPDATE "Product"
SET
  "averagePurchasePrice" = COALESCE("purchasePrice", 0),
  "currentStock" = COALESCE("stockQuantity", 0),
  "minimumStockLevel" = COALESCE("minStockAlert", 0);

-- AlterTable
ALTER TABLE "Product"
ALTER COLUMN "averagePurchasePrice" SET NOT NULL,
ALTER COLUMN "averagePurchasePrice" SET DEFAULT 0,
ALTER COLUMN "currentStock" SET NOT NULL,
ALTER COLUMN "currentStock" SET DEFAULT 0,
ALTER COLUMN "minimumStockLevel" SET NOT NULL,
ALTER COLUMN "minimumStockLevel" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Product"
DROP COLUMN "active",
DROP COLUMN "brand",
DROP COLUMN "category",
DROP COLUMN "minStockAlert",
DROP COLUMN "purchasePrice",
DROP COLUMN "stockQuantity";

-- AlterTable
ALTER TABLE "Service"
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "basePrice" DECIMAL(10,2),
ALTER COLUMN "durationMinutes" DROP NOT NULL;

-- DataMigration
UPDATE "Service"
SET "basePrice" = "price";

-- AlterTable
ALTER TABLE "Service"
ALTER COLUMN "basePrice" SET NOT NULL;

-- AlterTable
ALTER TABLE "Service"
DROP COLUMN "category",
DROP COLUMN "price";

-- DropTable
DROP TABLE "GiftVoucher";

-- DropTable
DROP TABLE "ProductSale";

-- DropEnum
DROP TYPE "GiftVoucherStatus";

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(10,2),
    "type" "StockMovementType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceConsumption" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageTemplateItem" (
    "id" TEXT NOT NULL,
    "packageTemplateId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPackage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "packageTemplateId" TEXT NOT NULL,
    "customPrice" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "remainingSessions" INTEGER NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "status" "ClientPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPackageUsage" (
    "id" TEXT NOT NULL,
    "clientPackageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "datePerformed" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPackageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" "SaleItemType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_supplierId_idx" ON "StockMovement"("supplierId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceConsumption_serviceId_idx" ON "ServiceConsumption"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceConsumption_productId_idx" ON "ServiceConsumption"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceConsumption_serviceId_productId_key" ON "ServiceConsumption"("serviceId", "productId");

-- CreateIndex
CREATE INDEX "PackageTemplate_name_idx" ON "PackageTemplate"("name");

-- CreateIndex
CREATE INDEX "PackageTemplate_active_idx" ON "PackageTemplate"("active");

-- CreateIndex
CREATE INDEX "PackageTemplateItem_packageTemplateId_idx" ON "PackageTemplateItem"("packageTemplateId");

-- CreateIndex
CREATE INDEX "PackageTemplateItem_serviceId_idx" ON "PackageTemplateItem"("serviceId");

-- CreateIndex
CREATE INDEX "ClientPackage_clientId_idx" ON "ClientPackage"("clientId");

-- CreateIndex
CREATE INDEX "ClientPackage_packageTemplateId_idx" ON "ClientPackage"("packageTemplateId");

-- CreateIndex
CREATE INDEX "ClientPackage_status_idx" ON "ClientPackage"("status");

-- CreateIndex
CREATE INDEX "ClientPackage_expirationDate_idx" ON "ClientPackage"("expirationDate");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_clientPackageId_idx" ON "ClientPackageUsage"("clientPackageId");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_serviceId_idx" ON "ClientPackageUsage"("serviceId");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_datePerformed_idx" ON "ClientPackageUsage"("datePerformed");

-- CreateIndex
CREATE INDEX "Sale_employeeId_idx" ON "Sale"("employeeId");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_type_idx" ON "SaleItem"("type");

-- CreateIndex
CREATE INDEX "SaleItem_referenceId_idx" ON "SaleItem"("referenceId");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_currentStock_idx" ON "Product"("currentStock");

-- CreateIndex
CREATE INDEX "Product_minimumStockLevel_idx" ON "Product"("minimumStockLevel");

-- CreateIndex
CREATE INDEX "Service_active_idx" ON "Service"("active");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceConsumption" ADD CONSTRAINT "ServiceConsumption_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceConsumption" ADD CONSTRAINT "ServiceConsumption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageTemplateItem" ADD CONSTRAINT "PackageTemplateItem_packageTemplateId_fkey" FOREIGN KEY ("packageTemplateId") REFERENCES "PackageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageTemplateItem" ADD CONSTRAINT "PackageTemplateItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_packageTemplateId_fkey" FOREIGN KEY ("packageTemplateId") REFERENCES "PackageTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_clientPackageId_fkey" FOREIGN KEY ("clientPackageId") REFERENCES "ClientPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
