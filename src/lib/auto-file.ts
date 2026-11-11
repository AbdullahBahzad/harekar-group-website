import type {
  EventClassification,
  EventSeverity,
  GovernorateKey,
  Region,
  ReportCategory,
  ReportNewsItem,
} from "@/lib/report-shape";
import { hits, normalise } from "@/lib/keyword-match";
import { KURDISTAN_GOVERNORATES, findPlaces } from "@/lib/places";

/**
 * Files a news story for the daily report without an AI service: where it
 * happened, which of the report's five sections it belongs to, what kind of
 * event it is, how serious, and a short summary — all read from the words
 * in its headline and text. The analyst reviews every field before saving;
 * these are starting values, not decisions.
 *
 * Client-safe, so the console's "Auto-fill" button can re-run it on edited
 * text without a round trip.
 */

type Rule<T extends string> = { value: T; words: string[] };

/** Event types, most specific first: the first rule with the most hits wins. */
const CLASSIFICATION_RULES: Rule<EventClassification>[] = [
  { value: "KIDNAPPING", words: ["kidnap", "abduct", "hostage", "اختطاف", "خطف", "مختطف", "ڕفاندن", "ڕفێنرا"] },
  { value: "EXPLOSION", words: ["explosion", "explosive", "ied", "bomb", "blast", "detonat", "انفجار", "عبوة", "تفجير", "تەقینەوە", "بۆمب"] },
  { value: "ATTACK", words: ["attack", "drone", "drones", "struck", "drone strike", "airstrike", "air strike", "missile", "rocket", "shelling", "gunmen", "ambush", "assault", "هجوم", "قصف", "مسيرة", "صاروخ", "هێرش", "درۆن", "بۆردومان"] },
  { value: "ARREST", words: ["arrest", "detain", "apprehend", "captured", "custody", "اعتقال", "القبض", "احتجاز", "دەستگیر", "گیرا"] },
  { value: "MILITARY_OPERATION", words: ["military operation", "security operation", "clearance operation", "raid", "military", "troops", "army", "peshmerga", "airstrike", "عملية أمنية", "عملية عسكرية", "عسكري", "الجيش", "البيشمركة", "ئۆپەراسیۆنی سەربازی", "پێشمەرگە", "سوپا"] },
  { value: "PROTEST", words: ["protest", "demonstrat", "sit-in", "rally", "strike by", "احتجاج", "تظاهر", "اعتصام", "خۆپیشاندان", "مانگرتن"] },
  { value: "CRIME", words: ["murder", "shot dead", "stabbed", "theft", "robbery", "smuggl", "drug", "narcotic", "crime", "قتل", "جريمة", "سرقة", "مخدرات", "تهريب", "کوشتن", "تاوان", "دزی", "ماددەی هۆشبەر"] },
  { value: "ACCIDENT", words: ["accident", "collision", "crash", "overturn", "drown", "حادث", "تصادم", "غرق", "ڕووداوی هاتووچۆ", "خنکا"] },
  { value: "NATURAL_DISASTER", words: ["earthquake", "flood", "storm", "wildfire", "landslide", "drought", "dust storm", "زلزال", "فيضان", "سيول", "عاصفة", "بوومەلەرزە", "لافاو", "ڕەشەبا"] },
  { value: "ECONOMIC", words: ["oil", "gas", "barrel", "export", "budget", "salary", "salaries", "investment", "dinar", "dollar", "market", "trade", "electricity", "نفط", "غاز", "موازنة", "رواتب", "استثمار", "الدولار", "نەوت", "مووچە", "بودجە", "کارەبا"] },
  { value: "POLITICAL", words: ["parliament", "election", "minister", "government", "cabinet", "governor$", "president", "party", "kdp", "puk", "agreement", "talks", "برلمان", "انتخابات", "وزير", "حكومة", "محافظ", "پەرلەمان", "هەڵبژاردن", "وەزیر", "حکومەت", "پارێزگار"] },
];

/** Event types that always file under Security Developments. */
const SECURITY_TYPES: EventClassification[] = ["KIDNAPPING", "EXPLOSION", "ATTACK", "ARREST", "MILITARY_OPERATION", "CRIME", "PROTEST"];
/** Event types that affect communities rather than security as such. */
const LOCAL_TYPES: EventClassification[] = ["NATURAL_DISASTER", "ACCIDENT"];

const SECTION_RULES: Rule<ReportCategory>[] = [
  { value: "SECURITY", words: ["security", "isis", "daesh", "pkk", "pmf", "militia", "militant", "terror", "police", "asayish", "checkpoint", "border guard", "الأمن", "داعش", "الحشد", "إرهاب", "الشرطة", "ئاسایش", "تیرۆر", "پۆلیس"] },
  { value: "MINISTERIAL", words: ["ministry", "minister", "ministerial", "وزارة", "وزير", "وەزارەت", "وەزیر"] },
  { value: "ECONOMIC", words: ["oil", "gas", "economy", "economic", "budget", "salary", "salaries", "investment", "market", "trade", "export", "dinar", "electricity", "flight", "flights", "airline", "airport", "kerosene", "fuel", "نفط", "اقتصاد", "موازنة", "رواتب", "تجارة", "نەوت", "ئابووری", "مووچە", "بازرگانی"] },
  { value: "GOVERNANCE_POLITICAL", words: ["parliament", "election", "government", "cabinet", "council", "governor$", "prime minister", "president", "political", "party", "decree", "law$", "برلمان", "انتخابات", "حكومة", "مجلس", "محافظ", "قانون", "پەرلەمان", "هەڵبژاردن", "حکومەت", "ئەنجومەن", "یاسا"] },
  { value: "LOCAL_INTERNATIONAL", words: ["embassy", "consulate", "united nations", "unami", "ngo", "foreign", "international", "company", "companies", "community", "residents", "villagers", "displaced", "سفارة", "قنصلية", "الأمم المتحدة", "منظمة", "شركة", "النازحين", "باڵیۆزخانە", "نەتەوە یەکگرتووەکان", "ڕێکخراو", "کۆمپانیا", "ئاوارە"] },
];

const HIGH_WORDS = ["killed", "dead", "death toll", "deaths", "bodies", "massacre", "suicide", "explosion", "ied", "car bomb", "drone strike", "airstrike", "missile", "rocket attack", "kidnap", "hostage", "isis attack", "قتلى", "مقتل", "انفجار", "مسيرة", "صاروخ", "اختطاف", "کوژرا", "کوژران", "تەقینەوە", "ڕفاندن"];
const MEDIUM_WORDS = ["injured", "wounded", "arrest", "clash", "protest", "demonstrat", "fire", "accident", "attack", "shooting", "gunfire", "threat", "جرحى", "إصابة", "اعتقال", "اشتباك", "احتجاج", "حريق", "حادث", "بریندار", "دەستگیر", "پێکدادان", "خۆپیشاندان", "ئاگر"];

/**
 * Whether normalised text contains a rule word. English words match from the
 * start of a word, so "ied" does not fire on "carried" nor "oil" on
 * "turmoil"; a word ending in "$" must match whole ("governor$" is not
 * "governorate").
 */
function contains(text: string, word: string): boolean {
  if (word.endsWith("$")) {
    const key = normalise(word.slice(0, -1));
    return new RegExp(`(^|[^\\p{L}\\p{N}])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(text);
  }
  return hits(text, word);
}

function hitCount(text: string, words: string[]): number {
  return words.reduce((n, word) => n + (contains(text, word) ? 1 : 0), 0);
}

/**
 * The rule with the highest score, where a word in the headline counts
 * twice: the headline says what the story is about, while the body often
 * mentions officials, places and context that are beside the point.
 */
function bestRule<T extends string>(headline: string, body: string, rules: Rule<T>[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const rule of rules) {
    const score = 2 * hitCount(headline, rule.words) + hitCount(body, rule.words);
    if (score > bestScore) {
      best = rule.value;
      bestScore = score;
    }
  }
  return best;
}

/** The first one or two sentences, for the Kurdistan short summaries. */
export function firstSentences(body: string, count = 2): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const sentences = flat.match(/[^.!?؟]+[.!?؟]+(\s|$)/g);
  const picked = sentences ? sentences.slice(0, count).join("").trim() : flat;
  return picked.length > 320 ? `${picked.slice(0, 317).trimEnd()}…` : picked;
}

/** The Region named without a governorate: "Kurdistan", "KRI", "KRG". */
const KURDISTAN_WORDS = ["kurdistan", "kri", "krg", "كردستان", "کوردستان", "هەرێمی کوردستان", "اقليم"];

export type AutoFiling = Pick<
  ReportNewsItem,
  "category" | "classification" | "severity" | "governorate" | "area" | "shortSummary"
> & { region?: Region };

/**
 * Suggested filing for one story. The headline weighs more than the body:
 * it is matched twice, so a story headlined "Drone strike near Koya" is an
 * attack in Erbil even if its last paragraph mentions Baghdad.
 */
export function autoFile(title: string, body: string): AutoFiling {
  const headline = normalise(title);
  const story = normalise(body);
  const text = `${headline} ${story}`;

  const classification = bestRule(headline, story, CLASSIFICATION_RULES) ?? "OTHER";
  const category: ReportCategory = SECURITY_TYPES.includes(classification)
    ? "SECURITY"
    : LOCAL_TYPES.includes(classification)
      ? "LOCAL_INTERNATIONAL"
      : bestRule(headline, story, SECTION_RULES) ??
      (classification === "ECONOMIC"
        ? "ECONOMIC"
        : classification === "POLITICAL"
          ? "GOVERNANCE_POLITICAL"
          : "LOCAL_INTERNATIONAL");

  const severity: EventSeverity =
    hitCount(text, HIGH_WORDS) > 0 ? "HIGH" : hitCount(text, MEDIUM_WORDS) > 0 ? "MEDIUM" : "LOW";

  // Place: the headline first, then the body. A named town beats a
  // governorate name — "Baghdad probes Khor Mor attack" happened at Khor Mor,
  // and the capital is only where the reaction came from.
  const pick = (hits: ReturnType<typeof findPlaces>) => hits.find((hit) => hit.area) ?? hits[0];
  const place = pick(findPlaces(title)) ?? pick(findPlaces(body)) ?? null;
  const governorate: GovernorateKey | null = place?.governorate ?? null;

  return {
    category,
    classification,
    severity,
    governorate,
    area: place?.area ?? null,
    shortSummary: firstSentences(body) || null,
    ...(governorate
      ? { region: KURDISTAN_GOVERNORATES.includes(governorate) ? "KURDISTAN" : "IRAQ" }
      : KURDISTAN_WORDS.some((word) => hits(headline, word))
        ? { region: "KURDISTAN" as const }
        : {}),
  };
}
