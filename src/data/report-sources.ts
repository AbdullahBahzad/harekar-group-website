/**
 * The outlets the analyst checks daily when building the Daily Security
 * Report — Kurdistan and Iraq-wide news in English.
 *
 * Deliberately just a list of homepages to jump to, not a scraper: which
 * stories make the report is a judgement call (see `reports.ts`), so this
 * only saves the analyst a bookmarks folder, not the decision itself.
 */
export const REPORT_SOURCES = [
  { name: "INA", url: "https://ina.iq/en/" },
  { name: "NINA", url: "https://www.ninanews.com/website/" },
  { name: "Shafaq News", url: "https://www.shafaq.com/en" },
  { name: "964 Media", url: "https://964media.com/" },
  { name: "Channel8", url: "https://channel8.com/english" },
  { name: "NRT", url: "https://www.nrttv.com/" },
  { name: "PUK Media", url: "https://www.pukmedia.com/EN/Home" },
  { name: "Kurdiu", url: "https://www.kurdiu.org/ku/" },
  { name: "Rudaw", url: "https://rudaw.net/english" },
  { name: "BasNews", url: "https://www.basnews.com/en/" },
  { name: "Kurdistan24", url: "https://www.kurdistan24.net/en" },
] as const;
