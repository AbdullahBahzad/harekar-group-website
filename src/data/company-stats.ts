/**
 * Employee, vehicle and operational-unit figures for 2024 and 2025, as
 * published on the company's own site (harekargroup.com, "Overview of
 * employee, vehicle, and operational unit statistics for 2024 and 2025").
 *
 * Labels live in the message catalogues under `stats.items.<id>`, so all
 * three languages stay in step. Update the numbers here when the company
 * publishes new ones.
 */
export const companyStats = [
  { id: "staticGuards", value: 350 },
  { id: "convoy", value: 100 },
  { id: "psd", value: 180 },
  { id: "cityGuards", value: 200 },
  { id: "trainers", value: 10 },
  { id: "qrf", value: 20 },
  { id: "vehicles", value: 113 },
  { id: "armored", value: 72 },
  { id: "softSkin", value: 41 },
  { id: "activeUnits", value: 1086 },
] as const;

/** The year the company was founded, in Erbil (confirmed by the company). */
export const FOUNDED_YEAR = 2008;
