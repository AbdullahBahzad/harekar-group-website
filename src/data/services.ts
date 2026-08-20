/**
 * Service keys drive the icon set and the translation lookups
 * (services.items.<key>.title / .description in the message catalogues).
 *
 * Services are grouped so a prospect can self-identify by need rather than
 * scanning thirteen equally-weighted cards.
 */
export const serviceGroups = [
  {
    id: "protection",
    services: [
      "facility",
      "static",
      "surveillance",
      "mobile",
      "k9",
    ],
  },
  {
    id: "response",
    services: ["erp", "crisis", "medevac"],
  },
  {
    id: "logistics",
    services: ["cit", "armored", "camp", "supply", "equipment"],
  },
] as const;

export type ServiceGroupId = (typeof serviceGroups)[number]["id"];

export const serviceKeys = serviceGroups.flatMap(
  (group) => group.services,
) as readonly ServiceKeyInternal[];

type ServiceKeyInternal = (typeof serviceGroups)[number]["services"][number];
export type ServiceKey = ServiceKeyInternal;
