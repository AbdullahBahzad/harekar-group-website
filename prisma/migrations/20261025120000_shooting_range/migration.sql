-- "Coming soon" services, and the first of them: the shooting range.
ALTER TABLE "Service" ADD COLUMN "comingSoon" BOOLEAN NOT NULL DEFAULT false;

-- Only when the services are already held in the database; an empty table
-- means the site is still showing the built-in list, which includes it.
INSERT INTO "Service" (
  "id", "slug", "group", "icon",
  "titleEn", "titleAr", "titleKu",
  "descriptionEn", "descriptionAr", "descriptionKu",
  "published", "sortOrder", "comingSoon", "createdAt", "updatedAt"
)
SELECT
  'svc_shooting_range', 'range', 'protection', 'range',
  'Shooting Range', 'ميدان الرماية', 'مەیدانی تەقەکردن',
  'A training range for weapons handling and marksmanship, for security teams and licensed clients. Opening soon.',
  'ميدان تدريب على التعامل مع الأسلحة ودقة الرماية، لفرق الأمن والعملاء المرخّصين. يُفتتح قريباً.',
  'مەیدانێکی ڕاهێنان بۆ مامەڵەکردن لەگەڵ چەک و وردی تەقەکردن، بۆ تیمەکانی ئاسایش و کڕیارە مۆڵەتپێدراوەکان. بەم زووانە دەکرێتەوە.',
  true, COALESCE((SELECT MAX("sortOrder") FROM "Service"), 0) + 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Service")
  AND NOT EXISTS (SELECT 1 FROM "Service" WHERE "slug" = 'range');
