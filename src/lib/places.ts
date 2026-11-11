import type { GovernorateKey } from "@/lib/report-shape";
import { normalise } from "@/lib/keyword-match";

/**
 * Where a piece of text is about: the governorates and towns it names, in
 * English, Arabic or Kurdish. Shared by Ask Harekar (reading a question) and
 * the report auto-filing (reading a news story).
 *
 * Client-safe: plain data, no server imports.
 */

type Place = {
  /** Names of the governorate itself, any language. */
  names: string[];
  /** Towns and districts inside it: [English name used as the area, ...aliases]. */
  towns: string[][];
};

export const PLACES: Record<GovernorateKey, Place> = {
  BAGHDAD: {
    names: ["baghdad", "بغداد", "بەغدا"],
    towns: [["Green Zone", "green zone", "المنطقة الخضراء"], ["Karkh", "karkh", "الكرخ"], ["Rusafa", "rusafa", "الرصافة"], ["Sadr City", "sadr city", "مدينة الصدر"], ["Abu Ghraib", "abu ghraib", "أبو غريب"], ["Taji", "taji", "التاجي"]],
  },
  WASIT: { names: ["wasit", "واسط"], towns: [["Kut", "kut", "الكوت"]] },
  SALAH_AL_DIN: {
    names: ["salah al-din", "salahuddin", "salah ad din", "saladin", "صلاح الدين", "سەلاحەدین"],
    towns: [["Tikrit", "tikrit", "تكريت"], ["Samarra", "samarra", "سامراء"], ["Baiji", "baiji", "بيجي"], ["Tuz Khurmatu", "tuz khurmatu", "tuz", "طوزخورماتو", "خورماتوو"], ["Balad", "balad", "بلد"]],
  },
  DIYALA: {
    names: ["diyala", "ديالى", "دیالە"],
    towns: [["Baqubah", "baqubah", "baquba", "بعقوبة"], ["Khanaqin", "khanaqin", "خانقين", "خانەقین"], ["Muqdadiyah", "muqdadiyah", "المقدادية"]],
  },
  ANBAR: {
    names: ["anbar", "الأنبار", "الانبار", "ئەنبار"],
    towns: [["Ramadi", "ramadi", "الرمادي"], ["Fallujah", "fallujah", "falluja", "الفلوجة"], ["Haditha", "haditha", "حديثة"], ["Al-Qaim", "qaim", "القائم"], ["Rutba", "rutba", "الرطبة"]],
  },
  BABIL: { names: ["babil", "babylon", "بابل"], towns: [["Hillah", "hillah", "hilla", "الحلة"], ["Jurf al-Sakhar", "jurf al-sakhar", "جرف الصخر"]] },
  KARBALA: { names: ["karbala", "kerbala", "كربلاء", "کەربەلا"], towns: [] },
  NAJAF: { names: ["najaf", "النجف", "نەجەف"], towns: [["Kufa", "kufa", "الكوفة"]] },
  QADISIYAH: { names: ["qadisiyah", "qadisiyyah", "القادسية"], towns: [["Diwaniyah", "diwaniyah", "diwaniya", "الديوانية"]] },
  MUTHANNA: { names: ["muthanna", "المثنى"], towns: [["Samawah", "samawah", "samawa", "السماوة"]] },
  DHI_QAR: { names: ["dhi qar", "thi qar", "ذي قار"], towns: [["Nasiriyah", "nasiriyah", "nasiriya", "الناصرية"]] },
  MAYSAN: { names: ["maysan", "missan", "ميسان"], towns: [["Amarah", "amarah", "amara", "العمارة"], ["Qal'at Salih", "qalat salih", "قلعة صالح"]] },
  BASRA: {
    names: ["basra", "basrah", "البصرة", "بەسرە"],
    towns: [["Zubair", "zubair", "الزبير"], ["Umm Qasr", "umm qasr", "أم قصر"], ["Rumaila", "rumaila", "الرميلة"], ["Abu al-Khaseeb", "abu al-khaseeb", "ابو الخصيب"], ["Shatt al-Arab", "shatt al-arab", "شط العرب"]],
  },
  NINAWA: {
    names: ["ninawa", "nineveh", "ninewa", "نينوى", "نەینەوا"],
    towns: [["Mosul", "mosul", "الموصل", "موسڵ", "موسل"], ["Sinjar", "sinjar", "shingal", "سنجار", "شنگال"], ["Tal Afar", "tal afar", "tel afar", "تلعفر"], ["Hamdaniya", "hamdaniya", "qaraqosh", "الحمدانية"], ["Bashiqa", "bashiqa", "بعشيقة"]],
  },
  KIRKUK: {
    names: ["kirkuk", "كركوك", "کەرکووک"],
    towns: [["Hawija", "hawija", "الحويجة", "حەویجە"], ["Dibis", "dibis", "دبس"], ["Daquq", "daquq", "داقوق"]],
  },
  ERBIL: {
    names: ["erbil", "arbil", "irbil", "hawler", "أربيل", "اربيل", "هەولێر"],
    towns: [["Koya", "koya", "koysinjaq", "كويه", "کۆیە"], ["Soran", "soran", "سوران", "سۆران"], ["Shaqlawa", "shaqlawa", "شقلاوة", "شەقڵاوە"], ["Makhmour", "makhmour", "مخمور", "مەخموور"], ["Khabat", "khabat", "خبات", "خەبات"], ["Choman", "choman", "چۆمان"], ["Sidakan", "sidakan", "سیدەکان"]],
  },
  SULAYMANIYAH: {
    names: ["sulaymaniyah", "sulaimani", "sulaimaniyah", "slemani", "suli", "السليمانية", "سلێمانی"],
    towns: [["Chamchamal", "chamchamal", "جمجمال", "چەمچەماڵ"], ["Ranya", "ranya", "رانية", "ڕانیە"], ["Penjwen", "penjwen", "بنجوين", "پێنجوێن"], ["Kalar", "kalar", "كلار", "کەلار"], ["Darbandikhan", "darbandikhan", "دربندیخان", "دەربەندیخان"], ["Garmian", "garmian", "گەرمیان", "كرميان"], ["Qaladze", "qaladze", "قەڵادزێ"], ["Khor Mor", "khor mor", "خور مور", "کۆرمۆر"]],
  },
  DUHOK: {
    names: ["duhok", "dohuk", "dahuk", "دهوك", "دهۆک"],
    towns: [["Zakho", "zakho", "زاخو", "زاخۆ"], ["Amadiya", "amadiya", "amedi", "العمادية", "ئامێدی"], ["Akre", "akre", "aqrah", "عقرة", "ئاکرێ"], ["Semel", "semel", "sumel", "سميل", "سێمێل"]],
  },
  HALABJA: { names: ["halabja", "حلبجة", "هەڵەبجە"], towns: [] },
};

/** The four governorates of the Kurdistan Region. */
export const KURDISTAN_GOVERNORATES: GovernorateKey[] = ["ERBIL", "SULAYMANIYAH", "DUHOK", "HALABJA"];

const LATIN = /^[a-z0-9]/;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether normalised text names a place (Latin names as whole-word starts). */
function mentions(text: string, name: string): number {
  const key = normalise(name);
  if (!key) return -1;
  if (LATIN.test(key)) {
    const match = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(key)}`, "u").exec(text);
    return match ? match.index : -1;
  }
  return text.indexOf(key);
}

export type PlaceHit = { governorate: GovernorateKey; area: string | null; position: number };

/**
 * Every governorate the text names, directly or through one of its towns,
 * in the order they first appear. A town hit carries the town as `area`.
 */
export function findPlaces(rawText: string): PlaceHit[] {
  const text = normalise(rawText);
  const hits: PlaceHit[] = [];
  for (const [key, place] of Object.entries(PLACES) as [GovernorateKey, Place][]) {
    let best: PlaceHit | null = null;
    for (const [area, ...aliases] of place.towns) {
      for (const alias of aliases) {
        const at = mentions(text, alias);
        if (at >= 0 && (!best || at < best.position)) best = { governorate: key, area, position: at };
      }
    }
    for (const name of place.names) {
      const at = mentions(text, name);
      // A town is the more useful hit; the governorate name only wins when
      // no town in it was named at all.
      if (at >= 0 && !best) best = { governorate: key, area: null, position: at };
    }
    if (best) hits.push(best);
  }
  return hits.sort((a, b) => a.position - b.position);
}
