-- Split `name` into first/last and add the company a recipient belongs to.
-- Existing names are carried over into `firstName` rather than dropped — there
-- is no reliable way to split "Sample Client" into two parts, and the greeting
-- reads fine with the whole label in one slot.
ALTER TABLE "ReportRecipient"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "company" TEXT;

UPDATE "ReportRecipient" SET "firstName" = "name" WHERE "name" IS NOT NULL;

ALTER TABLE "ReportRecipient" DROP COLUMN "name";
