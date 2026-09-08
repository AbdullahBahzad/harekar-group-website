import type { Headline } from "@/lib/headlines";

/**
 * Orders a source's headlines so the ones a security bulletin cares about
 * lead the list, and festival/sport/culture pieces sink toward the bottom.
 *
 * This sorts; it does not hide anything. The eleven sources are a mixed
 * feed by nature — a festival story sits next to a security incident on the
 * same homepage — and which of those belongs in the report is still the
 * analyst's call (see `reports.ts`). Burying the signal under sports scores
 * every day made that call tedious rather than easier, so this only changes
 * the order the analyst has to scan, never which stories they can pick from.
 *
 * Keyword matching, not a model: cheap, instant, needs no API key, and good
 * enough for a sort where being roughly right beats being exactly right —
 * a borderline story that scores 0 just lands in the middle, not lost.
 */

const HIGH_PRIORITY_EN = [
  // violence / security incidents
  "attack",
  "explosion",
  "explosive",
  " ied",
  "bomb",
  "blast",
  "shooting",
  "shot dead",
  "gunfire",
  "clash",
  "killed",
  "kills",
  "death toll",
  "wounded",
  "injured",
  "kidnap",
  "hostage",
  "terroris",
  "isis",
  "islamic state",
  "pkk",
  "militia",
  "militant",
  "insurgent",
  "assassinat",
  "raid",
  "arrest",
  "detain",
  "smuggl",
  "drone",
  "missile",
  "rocket",
  "airstrike",
  "strike on",
  // military / security forces
  "military",
  "army",
  "troops",
  "armed forces",
  "security forces",
  "asayish",
  "peshmerga",
  "police",
  "checkpoint",
  "border crossing",
  // unrest / disorder
  "protest",
  "riot",
  "unrest",
  "curfew",
  "clash with",
  // corruption / legal
  "corruption",
  "embezzle",
  "fraud",
  "sentenc",
  "convict",
  // political
  "government",
  "parliament",
  "cabinet",
  "minister",
  "election",
  "coalition",
  "kdp",
  "puk",
  "president",
  "prime minister",
  "dispute",
  "crisis",
  "tension",
  "sanction",
  "sovereignty",
  // economic / infrastructure disruption
  "currency",
  "dinar",
  "exchange rate",
  "fuel shortage",
  "gasoline",
  "shortage",
  "shutdown",
  "closure",
  "blockade",
  "flood",
  "earthquake",
  " fire ",
  "evacuat",
  "displace",
  "idp camp",
  "refugee",
  "outbreak",
  "epidemic",
];

const LOW_PRIORITY_EN = [
  "festival",
  "concert",
  "cinema",
  "exhibition",
  "art show",
  "tourism",
  "tourist",
  "championship",
  "football",
  "soccer",
  " match",
  "wins gold",
  "wins silver",
  "medal",
  "celebrat",
  "carnival",
  "music",
  "singer",
  "actor",
  "actress",
  "fashion",
  "recipe",
  "wedding",
  "birthday",
];

/** A smaller supplementary list for the Arabic (964 Media) and Kurdish (Kurdiu) sources. */
const HIGH_PRIORITY_OTHER = [
  "هجوم",
  "انفجار",
  "اعتقال",
  "تفجير",
  "مسلح",
  "احتجاج",
  "اشتباك",
  "پەلامار",
  "تەقینەوە",
  "دەستگیرکردن",
  "ناڕەزایی",
  "پارتیزان",
];

const LOW_PRIORITY_OTHER = [
  "مهرجان",
  "فستيفال",
  "سياحة",
  "فیستیڤاڵ",
  "گەشتیاری",
  "هونەر",
];

function relevanceScore(title: string): number {
  const lower = title.toLowerCase();
  let score = 0;
  for (const kw of HIGH_PRIORITY_EN) if (lower.includes(kw)) score += 1;
  for (const kw of LOW_PRIORITY_EN) if (lower.includes(kw)) score -= 1;
  for (const kw of HIGH_PRIORITY_OTHER) if (title.includes(kw)) score += 1;
  for (const kw of LOW_PRIORITY_OTHER) if (title.includes(kw)) score -= 1;
  return score;
}

/** Highest-scoring first; ties keep their original (homepage) order. */
export function sortByRelevance(headlines: Headline[]): Headline[] {
  return headlines
    .map((headline, index) => ({ headline, index, score: relevanceScore(headline.title) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.headline);
}
