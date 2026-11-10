import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { governorateAt } from "@/lib/governorates";
import { GOVERNORATES, type GovernorateKey, type ThreatLevel } from "@/lib/report-shape";
import ar from "@/messages/ar.json";
import ckb from "@/messages/ckb.json";

/**
 * Ask Harekar without an AI service: the question is read for places, a time
 * period, a severity and topic words, the incident register and the daily
 * report events are searched with them, and the answer is assembled from
 * what was found — counts, the busiest places, the most recent and most
 * serious matches — with every match cited and linked.
 *
 * It cannot reason or summarise freely the way a language model can, but it
 * costs nothing to run, never states anything that is not on file, and reads
 * English, Arabic and Kurdish questions.
 */

const DAY = 86_400_000;

export type AskCitation = {
  kind: "incident" | "event";
  title: string;
  /** ISO date-time. */
  date: string;
  place: string | null;
  /** "CRITICAL" | "ELEVATED" | "CLEAR" for incidents; "HIGH" | "MEDIUM" | "LOW" for events. */
  severity: string | null;
  /** In-app path (locale-free). */
  href: string;
};

export type LocalAnswer = { answer: string; citations: AskCitation[] };

/* ---- reading the question ------------------------------------------------- */

/** Spellings, towns and transliterations that point at each governorate. */
const PLACE_ALIASES: Record<GovernorateKey, string[]> = {
  BAGHDAD: ["baghdad", "green zone", "karkh", "rusafa", "sadr city", "abu ghraib"],
  WASIT: ["wasit", "kut"],
  SALAH_AL_DIN: ["salah al-din", "salahuddin", "salah ad din", "saladin", "tikrit", "samarra", "baiji", "tuz khurmatu", "tuz"],
  DIYALA: ["diyala", "baqubah", "baquba", "khanaqin", "muqdadiyah"],
  ANBAR: ["anbar", "ramadi", "fallujah", "falluja", "haditha", "qaim", "rutba"],
  BABIL: ["babil", "babylon", "hillah", "hilla", "jurf al-sakhar"],
  KARBALA: ["karbala", "kerbala"],
  NAJAF: ["najaf", "kufa"],
  QADISIYAH: ["qadisiyah", "qadisiyyah", "diwaniyah", "diwaniya"],
  MUTHANNA: ["muthanna", "samawah", "samawa"],
  DHI_QAR: ["dhi qar", "thi qar", "nasiriyah", "nasiriya"],
  MAYSAN: ["maysan", "missan", "amarah", "amara"],
  BASRA: ["basra", "basrah", "zubair", "umm qasr", "rumaila", "abu al-khaseeb"],
  NINAWA: ["ninawa", "nineveh", "ninewa", "mosul", "sinjar", "tal afar", "tel afar", "hamdaniya", "qaraqosh"],
  KIRKUK: ["kirkuk", "hawija", "dibis", "daquq"],
  ERBIL: ["erbil", "arbil", "irbil", "hawler", "koya", "koysinjaq", "soran", "shaqlawa", "makhmour", "khabat"],
  SULAYMANIYAH: ["sulaymaniyah", "sulaimani", "sulaimaniyah", "slemani", "suli", "chamchamal", "ranya", "penjwen", "kalar", "darbandikhan", "garmian"],
  DUHOK: ["duhok", "dohuk", "dahuk", "zakho", "amadiya", "akre", "aqrah", "semel"],
  HALABJA: ["halabja"],
};

/** The four governorates of the Kurdistan Region, for "Kurdistan"/"KRI". */
const KURDISTAN: GovernorateKey[] = ["ERBIL", "SULAYMANIYAH", "DUHOK", "HALABJA"];
const KURDISTAN_WORDS = ["kurdistan", "kri", "krg", "كردستان", "کوردستان", "هەرێم", "اقليم"];

/** Arabic and Kurdish governorate names, straight from the translation files. */
function localNames(): Record<GovernorateKey, string[]> {
  const pick = (messages: unknown) =>
    (messages as { reportVocab?: { governorates?: Record<string, string> } }).reportVocab
      ?.governorates ?? {};
  const a = pick(ar);
  const k = pick(ckb);
  return Object.fromEntries(
    GOVERNORATES.map(({ key }) => [key, [a[key], k[key]].filter(Boolean).map((n) => n.toLowerCase())]),
  ) as Record<GovernorateKey, string[]>;
}

/** Topic words, grouped so one word finds its synonyms (all languages). */
const TOPICS: string[][] = [
  ["protest", "protests", "demonstration", "demonstrators", "sit-in", "unrest", "احتجاج", "تظاهرة", "متظاهرين", "خۆپیشاندان"],
  ["attack", "attacked", "assault", "strike", "strikes", "هجوم", "هێرش"],
  ["drone", "drones", "uav", "مسيرة", "طائرة مسيرة", "درۆن"],
  ["kidnap", "kidnapped", "kidnapping", "abduct", "abducted", "اختطاف", "خطف", "ڕفاندن"],
  ["arrest", "arrested", "detained", "apprehend", "اعتقال", "القبض", "دەستگیر"],
  ["explosion", "explosive", "ied", "bomb", "blast", "انفجار", "عبوة", "تەقینەوە"],
  ["killed", "murder", "shot", "dead", "death", "قتل", "مقتل", "کوشتن"],
  ["accident", "collision", "crash", "traffic", "حادث", "تصادم", "ڕووداوی هاتووچۆ"],
  ["earthquake", "flood", "fire", "storm", "زلزال", "فيضان", "حريق", "بوومەلەرزە", "لافاو"],
  ["oil", "gas", "energy", "pipeline", "نفط", "غاز", "نەوت"],
  ["isis", "daesh", "isil", "داعش"],
  ["pmf", "hashd", "popular mobilization", "الحشد"],
  ["border", "crossing", "infiltrat", "حدود", "سنوور"],
  ["ministry", "minister", "وزارة", "وزير", "وەزارەت", "وەزیر"],
  ["election", "parliament", "انتخابات", "برلمان", "هەڵبژاردن", "پەرلەمان"],
  ["crime", "theft", "robbery", "جريمة", "سرقة", "تاوان"],
];

type Parsed = {
  governorates: GovernorateKey[];
  since: number;
  until: number;
  /** A phrase for the period, as a key and count for the answer's wording. */
  period: { key: "today" | "yesterday" | "days" | "month" | "default"; count?: number };
  severity: "high" | "medium" | "low" | null;
  topics: string[][];
  intent: "threat" | "summary" | "search";
  briefCount: number;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fourteen: 14, thirty: 30,
};

function readNumber(text: string): number | null {
  const digits = text.match(/\d+/);
  if (digits) return Number(digits[0]);
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return null;
}

function parse(question: string, now: number): Parsed {
  const q = ` ${question.toLowerCase().replace(/[?!.,؟،]/g, " ")} `;
  const has = (word: string) => q.includes(word);

  // Places.
  const names = localNames();
  const governorates = new Set<GovernorateKey>();
  for (const { key } of GOVERNORATES) {
    const words = [...PLACE_ALIASES[key], ...names[key]];
    if (words.some((word) => (/^[a-z]/.test(word) ? new RegExp(`\\b${word}`).test(q) : has(word)))) {
      governorates.add(key);
    }
  }
  if (KURDISTAN_WORDS.some(has)) KURDISTAN.forEach((key) => governorates.add(key));

  // Period. The default is the last 30 days: long enough to answer "recently",
  // short enough that old events do not crowd out current ones.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  let since = now - 30 * DAY;
  let until = Infinity;
  let period: Parsed["period"] = { key: "default", count: 30 };
  const n = readNumber(q);
  if (has(" today") || has("اليوم") || has("ئەمڕۆ")) {
    since = startOfToday.getTime();
    period = { key: "today" };
  } else if (has("yesterday") || has("أمس") || has("امس") || has("دوێنێ")) {
    since = startOfToday.getTime() - DAY;
    until = startOfToday.getTime();
    period = { key: "yesterday" };
  } else if (/(\d+|\b\w+\b)\s*(day|days|يوم|أيام|ايام|ڕۆژ)/.test(q) && n) {
    since = now - n * DAY;
    period = { key: "days", count: n };
  } else if (/(\d+|\b\w+\b)\s*(week|weeks|أسبوع|اسابيع|هەفتە)/.test(q) && n) {
    since = now - n * 7 * DAY;
    period = { key: "days", count: n * 7 };
  } else if (has("week") || has("أسبوع") || has("الاسبوع") || has("هەفتە")) {
    since = now - 7 * DAY;
    period = { key: "days", count: 7 };
  } else if (/(\d+|\b\w+\b)\s*(month|months|شهر|أشهر|مانگ)/.test(q) && n) {
    since = now - n * 30 * DAY;
    period = { key: "days", count: n * 30 };
  } else if (has("month") || has("شهر") || has("مانگ")) {
    since = now - 30 * DAY;
    period = { key: "month" };
  } else if (has("recent") || has("latest") || has("مؤخرا") || has("دوایی")) {
    since = now - 14 * DAY;
    period = { key: "days", count: 14 };
  }

  // Severity.
  let severity: Parsed["severity"] = null;
  if (/\b(high|critical|serious|severe|major)\b/.test(q) || has("خطير") || has("حرج") || has("مەترسیدار")) severity = "high";
  else if (/\b(medium|moderate|elevated)\b/.test(q) || has("متوسط")) severity = "medium";
  else if (/\b(low|minor)\b/.test(q) || has("منخفض")) severity = "low";

  const topics = TOPICS.filter((group) => group.some((word) => has(word)));

  // What kind of question.
  const intent: Parsed["intent"] =
    /\b(threat level|threat|risk|how safe|safe|security situation)\b/.test(q) ||
    has("مستوى التهديد") || has("التهديد") || has("هەڕەشە") || has("مەترسی")
      ? "threat"
      : /\b(summar\w*|brief|briefs|overview|report|reports)\b/.test(q) || has("ملخص") || has("موجز") || has("کورتە")
        ? "summary"
        : "search";

  return {
    governorates: [...governorates],
    since,
    until,
    period,
    severity,
    topics,
    intent,
    briefCount: Math.min(Math.max(n ?? 3, 1), 7),
  };
}

/* ---- answering -------------------------------------------------------------- */

const INCIDENT_RANK: Record<string, number> = { CRITICAL: 3, ELEVATED: 2, CLEAR: 1 };
const EVENT_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export async function answerLocally(question: string, locale: string): Promise<LocalAnswer> {
  const t = await getTranslations({ locale, namespace: "portal.ask.local" });
  const tGov = await getTranslations({ locale, namespace: "reportVocab.governorates" });
  const tThreat = await getTranslations({ locale, namespace: "reportVocab.threatLevels" });
  const tSeverity = await getTranslations({ locale, namespace: "intelligence.severity" });

  const now = Date.now();
  const p = parse(question, now);
  const dateFmt = (iso: Date | string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale, {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Baghdad",
    });
  const gov = (key: string | null) => (key ? tGov(key) : null);

  const scope =
    p.governorates.length === 0
      ? t("scopeAll")
      : p.governorates.length === KURDISTAN.length && KURDISTAN.every((k) => p.governorates.includes(k))
        ? t("scopeKurdistan")
        : t("scopeIn", { places: p.governorates.map((key) => tGov(key)).join(", ") });
  const periodText =
    p.period.key === "today"
      ? t("periodToday")
      : p.period.key === "yesterday"
        ? t("periodYesterday")
        : p.period.key === "month"
          ? t("periodMonth")
          : t("periodDays", { count: p.period.count ?? 30 });

  const lines: string[] = [];

  /* Threat questions: the latest report's ratings, and the matrix rows for
     any governorate asked about. */
  if (p.intent === "threat") {
    const latest = await prisma.dailyReport.findFirst({ orderBy: { date: "desc" } });
    if (latest) {
      lines.push(
        t("threatLatest", {
          date: dateFmt(latest.date),
          kurdistan: tThreat(latest.kurdistanThreat as ThreatLevel),
          iraq: tThreat(latest.iraqThreat as ThreatLevel),
        }),
      );
      const matrix =
        ((latest.content as { governorates?: { governorate: string; risk: string; driver?: string }[] } | null)
          ?.governorates) ?? [];
      for (const key of p.governorates) {
        const row = matrix.find((entry) => entry.governorate === key);
        if (row) {
          lines.push(
            t("threatGovernorate", {
              governorate: tGov(key),
              risk: tThreat(row.risk as ThreatLevel),
              driver: row.driver?.trim() || t("noDriver"),
            }),
          );
        }
      }
    }
  }

  /* Summary questions: the last few briefs, newest first. */
  if (p.intent === "summary") {
    const briefs = await prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
      take: p.briefCount,
      include: { events: { orderBy: { position: "asc" }, take: 3, select: { title: true } } },
    });
    for (const brief of briefs) {
      const text =
        brief.executiveSummary?.trim() ||
        brief.events.map((event) => event.title).join("; ") ||
        t("emptyBrief");
      lines.push(`${dateFmt(brief.date)}: ${text}`);
    }
  }

  /* Every question also searches incidents and report events. */
  const textMatches = (haystack: string) =>
    p.topics.every((group) => group.some((word) => haystack.includes(word)));
  const inWindow = (at: number) => at >= p.since && at < p.until;

  const markers = await prisma.intelMarker.findMany({
    where: { published: true },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 1000,
  });
  const incidents = markers
    .map((m) => ({ m, at: (m.occurredAt ?? m.createdAt).getTime(), key: governorateAt(m.longitude, m.latitude) }))
    .filter(({ m, at, key }) => {
      if (!inWindow(at)) return false;
      if (p.governorates.length && !(key && p.governorates.includes(key))) return false;
      if (p.severity === "high" && m.severity !== "CRITICAL") return false;
      if (p.severity === "medium" && m.severity !== "ELEVATED") return false;
      if (p.severity === "low" && m.severity !== "CLEAR") return false;
      const text = [m.headline, m.label, m.body, m.category, m.method, m.actor, m.target, m.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return textMatches(text);
    });

  const eventRows = await prisma.reportEvent.findMany({
    where: { occurredOn: { gte: new Date(Math.max(p.since - DAY, 0)) } },
    orderBy: { occurredOn: "desc" },
    take: 1000,
  });
  const events = eventRows.filter((e) => {
    // Events are dated by report day, so compare whole days.
    const at = e.occurredOn.getTime();
    if (at + DAY <= p.since || at >= p.until) return false;
    if (p.governorates.length && !(e.governorate && p.governorates.includes(e.governorate as GovernorateKey))) return false;
    if (p.severity === "high" && e.severity !== "HIGH") return false;
    if (p.severity === "medium" && e.severity !== "MEDIUM") return false;
    if (p.severity === "low" && e.severity !== "LOW") return false;
    return textMatches([e.title, e.body, e.shortSummary, e.area, e.district, e.classification].filter(Boolean).join(" ").toLowerCase());
  });

  const total = incidents.length + events.length;
  // A threat or summary question gets the search block only when it named
  // something to search for; otherwise it is noise under the real answer.
  const specific = p.governorates.length > 0 || p.topics.length > 0 || p.severity !== null;
  if (p.intent === "search" || specific) {
    if (p.intent === "search" && !specific) lines.push(t("broadScope"));
    if (total === 0) {
      lines.push(t("noMatches", { scope, period: periodText }));
    } else {
      lines.push(t("matches", { incidents: incidents.length, events: events.length, scope, period: periodText }));
      if (p.severity) lines.push(t("severityOnly", { level: t(`severityWord.${p.severity}`) }));

      if (incidents.length) {
        const bySeverity = ["CRITICAL", "ELEVATED", "CLEAR"]
          .map((level) => ({ level, count: incidents.filter(({ m }) => m.severity === level).length }))
          .filter(({ count }) => count > 0)
          .map(({ level, count }) => `${tSeverity(level.toLowerCase())}: ${count}`)
          .join(" · ");
        lines.push(t("severityBreakdown", { breakdown: bySeverity }));
      }

      // Busiest places, across both sources.
      const places = new Map<string, number>();
      for (const { key } of incidents) if (key) places.set(key, (places.get(key) ?? 0) + 1);
      for (const e of events) if (e.governorate) places.set(e.governorate, (places.get(e.governorate) ?? 0) + 1);
      const busiest = [...places.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (busiest.length > 1 || (busiest.length === 1 && p.governorates.length !== 1)) {
        lines.push(t("busiest", { places: busiest.map(([key, count]) => `${tGov(key)} (${count})`).join(", ") }));
      }

      const latest = [...incidents.map(({ m, at, key }) => ({ title: m.headline ?? m.label, at, place: gov(key) ?? m.city })),
        ...events.map((e) => ({ title: e.title, at: e.occurredOn.getTime(), place: gov(e.governorate) ?? e.area }))]
        .sort((a, b) => b.at - a.at)[0];
      if (latest) {
        lines.push(
          t("mostRecent", {
            title: latest.title,
            date: dateFmt(new Date(latest.at)),
            place: latest.place ?? t("unknownPlace"),
          }),
        );
      }
    }
  }

  // The most serious and most recent matches, cited — only when the search
  // block was part of the answer.
  const citations: AskCitation[] = !(p.intent === "search" || specific) ? [] : [
    ...incidents.map(({ m, at, key }) => ({
      rank: INCIDENT_RANK[m.severity] ?? 0,
      at,
      c: {
        kind: "incident" as const,
        title: m.headline ?? m.label,
        date: new Date(at).toISOString(),
        place: gov(key) ?? m.city,
        severity: m.severity,
        href: `/portal/incidents/${m.id}`,
      },
    })),
    ...events.map((e) => ({
      rank: e.severity ? EVENT_RANK[e.severity] ?? 0 : 0,
      at: e.occurredOn.getTime(),
      c: {
        kind: "event" as const,
        title: e.title,
        date: e.occurredOn.toISOString(),
        place: gov(e.governorate) ?? e.area,
        severity: e.severity,
        href: "/portal/reports",
      },
    })),
  ]
    .sort((a, b) => b.rank - a.rank || b.at - a.at)
    .slice(0, 8)
    .map(({ c }) => c);

  if (lines.length === 0) lines.push(t("noMatches", { scope, period: periodText }));
  return { answer: lines.join("\n\n"), citations };
}
