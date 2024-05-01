-- CreateEnum
CREATE TYPE "AppMigrationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "AppMigration" (
    "name" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "AppMigrationStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppMigration_pkey" PRIMARY KEY ("name")
);
