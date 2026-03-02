-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "baseSalary" DECIMAL(10,2),
    "commissionPercentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- DataMigration
INSERT INTO "Employee" ("id", "name", "email", "active", "createdAt", "updatedAt")
SELECT
  "id",
  COALESCE("name", split_part("email", '@', 1)),
  "email",
  true,
  "createdAt",
  "updatedAt"
FROM "User"
ON CONFLICT ("id") DO NOTHING;

-- Ensure fallback employee exists for legacy rows without an employee assignment
INSERT INTO "Employee" ("id", "name", "email", "active", "createdAt", "updatedAt")
VALUES ('system_employee', 'System', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE "ServiceEmployee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEmployee_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ClientPackageUsage" ADD COLUMN "employeeId" TEXT;

-- DataMigration
UPDATE "ClientPackageUsage"
SET "employeeId" = 'system_employee'
WHERE "employeeId" IS NULL;

-- AlterTable
ALTER TABLE "ClientPackageUsage" ALTER COLUMN "employeeId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_employeeId_fkey";

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_name_idx" ON "Employee"("name");

-- CreateIndex
CREATE INDEX "Employee_active_idx" ON "Employee"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEmployee_employeeId_serviceId_key" ON "ServiceEmployee"("employeeId", "serviceId");

-- CreateIndex
CREATE INDEX "ServiceEmployee_employeeId_idx" ON "ServiceEmployee"("employeeId");

-- CreateIndex
CREATE INDEX "ServiceEmployee_serviceId_idx" ON "ServiceEmployee"("serviceId");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_employeeId_idx" ON "ClientPackageUsage"("employeeId");

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEmployee" ADD CONSTRAINT "ServiceEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEmployee" ADD CONSTRAINT "ServiceEmployee_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
