-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StaffType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "baseSalary" DECIMAL(10,2),
    "commissionPercentage" DECIMAL(5,2),
    "profitSharePercentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- DataMigration: migrate old Employee records to Staff as INTERNAL (if Employee table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Employee'
  ) THEN
    INSERT INTO "Staff" ("id", "name", "type", "active", "baseSalary", "commissionPercentage", "createdAt", "updatedAt")
    SELECT
      "id",
      "name",
      'INTERNAL'::"StaffType",
      "active",
      "baseSalary",
      "commissionPercentage",
      "createdAt",
      "updatedAt"
    FROM "Employee"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

-- Safety fallback for environments that only had User rows
INSERT INTO "Staff" ("id", "name", "type", "active", "createdAt", "updatedAt")
SELECT
  "id",
  COALESCE("name", split_part("email", '@', 1)),
  'INTERNAL'::"StaffType",
  true,
  "createdAt",
  "updatedAt"
FROM "User"
ON CONFLICT ("id") DO NOTHING;

-- Ensure fallback staff exists for legacy package usage rows
INSERT INTO "Staff" ("id", "name", "type", "active", "createdAt", "updatedAt")
VALUES ('system_staff', 'System Staff', 'INTERNAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN "externalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "salonAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "staffId" TEXT;

-- DataMigration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Sale' AND column_name = 'employeeId'
  ) THEN
    EXECUTE '
      UPDATE "Sale"
      SET
        "staffId" = COALESCE("employeeId", ''system_staff''),
        "externalAmount" = 0,
        "salonAmount" = "totalAmount"
      WHERE "staffId" IS NULL
    ';
  ELSE
    EXECUTE '
      UPDATE "Sale"
      SET
        "staffId" = ''system_staff'',
        "externalAmount" = 0,
        "salonAmount" = "totalAmount"
      WHERE "staffId" IS NULL
    ';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Sale"
ALTER COLUMN "staffId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ClientPackageUsage" ADD COLUMN "staffId" TEXT;

-- DataMigration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ClientPackageUsage' AND column_name = 'employeeId'
  ) THEN
    EXECUTE '
      UPDATE "ClientPackageUsage"
      SET "staffId" = COALESCE("employeeId", ''system_staff'')
      WHERE "staffId" IS NULL
    ';
  ELSE
    EXECUTE '
      UPDATE "ClientPackageUsage"
      SET "staffId" = ''system_staff''
      WHERE "staffId" IS NULL
    ';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "ClientPackageUsage"
ALTER COLUMN "staffId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "ClientPackageUsage" DROP CONSTRAINT IF EXISTS "ClientPackageUsage_employeeId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Sale_employeeId_idx";

-- DropIndex
DROP INDEX IF EXISTS "ClientPackageUsage_employeeId_idx";

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Staff_name_idx" ON "Staff"("name");

-- CreateIndex
CREATE INDEX "Staff_type_idx" ON "Staff"("type");

-- CreateIndex
CREATE INDEX "Staff_active_idx" ON "Staff"("active");

-- CreateIndex
CREATE INDEX "Sale_staffId_idx" ON "Sale"("staffId");

-- CreateIndex
CREATE INDEX "ClientPackageUsage_staffId_idx" ON "ClientPackageUsage"("staffId");

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN IF EXISTS "employeeId";

-- AlterTable
ALTER TABLE "ClientPackageUsage" DROP COLUMN IF EXISTS "employeeId";
