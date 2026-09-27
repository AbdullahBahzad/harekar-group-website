-- CreateEnum
CREATE TYPE "PortalGuestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "DailyReport" ADD COLUMN     "executiveSummary" TEXT;

-- CreateTable
CREATE TABLE "PortalGuest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT,
    "status" "PortalGuestStatus" NOT NULL DEFAULT 'PENDING',
    "accountId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PortalGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalGuest_token_key" ON "PortalGuest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PortalGuest_accountId_key" ON "PortalGuest"("accountId");

-- CreateIndex
CREATE INDEX "PortalGuest_ownerId_idx" ON "PortalGuest"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalGuest_ownerId_email_key" ON "PortalGuest"("ownerId", "email");

-- AddForeignKey
ALTER TABLE "PortalGuest" ADD CONSTRAINT "PortalGuest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalGuest" ADD CONSTRAINT "PortalGuest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
