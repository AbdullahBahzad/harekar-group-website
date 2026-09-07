/**
 * The fixed set of outlets the Daily Security Report is always built from.
 *
 * Doubles as the homepage each is checked against by `fetchHeadlines`
 * (`lib/headlines.ts`) to build the "today's headlines" checklist in the
 * console, and as a plain jump-to link next to it for opening a story
 * directly. Either way, which stories make the report stays a human
 * decision (see `reports.ts`) — this list only saves the trip to each site,
 * not the judgement call.
 *
 * `defaultRegion` is a starting guess for a headline pulled from that
 * outlet, pre-filling the per-item region picker rather than leaving it
 * unset — the analyst can still change it per story, since several of these
 * outlets (Shafaq, INA, NINA, 964) cover both Kurdistan and Iraq-wide news.
 */
export const REPORT_SOURCES = [
  { name: "INA", url: "https://ina.iq/en/", defaultRegion: "IRAQ" },
  { name: "NINA", url: "https://www.ninanews.com/website/", defaultRegion: "IRAQ" },
  { name: "Shafaq News", url: "https://www.shafaq.com/en", defaultRegion: "IRAQ" },
  { name: "964 Media", url: "https://964media.com/", defaultRegion: "IRAQ" },
  { name: "Channel8", url: "https://channel8.com/english", defaultRegion: "KURDISTAN" },
  { name: "NRT", url: "https://www.nrttv.com/", defaultRegion: "KURDISTAN" },
  { name: "PUK Media", url: "https://www.pukmedia.com/EN/Home", defaultRegion: "KURDISTAN" },
  { name: "Kurdiu", url: "https://www.kurdiu.org/ku/", defaultRegion: "KURDISTAN" },
  { name: "Rudaw", url: "https://rudaw.net/english", defaultRegion: "KURDISTAN" },
  { name: "BasNews", url: "https://www.basnews.com/en/", defaultRegion: "KURDISTAN" },
  { name: "Kurdistan24", url: "https://www.kurdistan24.net/en", defaultRegion: "KURDISTAN" },
] as const;
