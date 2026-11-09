-- Daily Security Report events get their own table, so weekly, monthly and
-- six-week reports and their event maps can be built from one shared record.

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('SECURITY', 'ECONOMIC', 'MINISTERIAL', 'GOVERNANCE_POLITICAL', 'LOCAL_INTERNATIONAL');

-- CreateTable
CREATE TABLE "ReportEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "shortSummary" TEXT,
    "category" "ReportCategory",
    "classification" TEXT,
    "region" TEXT NOT NULL,
    "governorate" TEXT,
    "district" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportEvent_occurredOn_idx" ON "ReportEvent"("occurredOn");

-- CreateIndex
CREATE INDEX "ReportEvent_reportId_position_idx" ON "ReportEvent"("reportId", "position");

-- AddForeignKey
ALTER TABLE "ReportEvent" ADD CONSTRAINT "ReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy every existing report's items into the new table, in their original
-- order. They predate categories, so `category` stays null (the report prints
-- them under "General"). The legacy `items` array is left in place in
-- `content`: nothing reads it any more, but it keeps the original text intact
-- should this release ever need rolling back.
INSERT INTO "ReportEvent" (
  "id", "reportId", "position", "occurredOn",
  "title", "body", "region", "sourceUrl"
)
SELECT
  'mig_' || md5(r."id" || ':' || item.ord::text),
  r."id",
  (item.ord - 1)::int,
  r."date",
  COALESCE(NULLIF(btrim(item.value->>'title'), ''), 'Untitled item'),
  COALESCE(item.value->>'body', ''),
  CASE WHEN item.value->>'region' IN ('KURDISTAN', 'IRAQ')
       THEN item.value->>'region' ELSE 'IRAQ' END,
  NULLIF(btrim(item.value->>'url'), '')
FROM "DailyReport" r
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(r."content"->'items') = 'array'
       THEN r."content"->'items' ELSE '[]'::jsonb END
) WITH ORDINALITY AS item(value, ord);
