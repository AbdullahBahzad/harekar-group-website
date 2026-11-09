-- How serious each report event is (LOW / MEDIUM / HIGH), for the portal's
-- severity counters, Top Incidents and threat-intensity chart. Optional:
-- events filed before this column existed have none.
ALTER TABLE "ReportEvent" ADD COLUMN "severity" TEXT;
