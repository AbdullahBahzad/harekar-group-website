-- AlterTable
ALTER TABLE "IntelMarker" ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;
