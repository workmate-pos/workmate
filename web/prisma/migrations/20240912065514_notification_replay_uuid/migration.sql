/*
  Warnings:

  - A unique constraint covering the columns `[replayUuid]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "replayUuid" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_replayUuid_key" ON "Notification"("replayUuid");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_replayUuid_fkey" FOREIGN KEY ("replayUuid") REFERENCES "Notification"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
