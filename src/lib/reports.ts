import { lookup } from "node:dns/promises";
import Anthropic from "@anthropic-ai/sdk";

export const THREAT_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export const REGIONS = ["KURDISTAN", "IRAQ"] as const;
export type Region = (typeof REGIONS)[number];

export type ReportNewsItem = {
  title: string;
  body: string;
  url: string | null;
  region: Region;
};

/** Shape of `DailyReport.content` in the database. */
export type ReportContent = {
  items: ReportNewsItem[];
};

export type RawNewsInput = {
  url: string;
  notes: string;
  region: Region;
};

/**
 * Addresses that must never be reachable from a URL somebody typed into a form.
 *
 * The interesting entry is 169.254.169.254: on every major cloud that is the
 * instance metadata service, and on many deployments it will hand out the
 * machine's credentials to anything that asks.
 */
function isBlockedAddress(address: string, family: number): boolean {
  if (family === 6) {
    const ip = address.toLowerCase();

    // An IPv4-mapped address (::ffff:127.0.0.1) is IPv4 wearing a v6 coat.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    if (mapped) return isBlockedAddress(mapped[1], 4);

    if (ip === "::" || ip === "::1") return true;
    // Unique-local fc00::/7, then link-local fe80::/10.
    return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
  }

  const [a, b] = address.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

/**
 * Resolves a URL and refuses anything pointing back inside the network.
 *
 * The console accepts any address an operator types and this fetch runs on the
 * server, so without a check the field is a window onto everything the server
 * can reach and the internet cannot — Postgres, other internal services, the
 * metadata endpoint above.
 *
 * The hostname is *resolved* rather than pattern-matched, because
 * `http://intranet.example.com/` looks perfectly public right up until DNS
 * answers with 10.0.0.5.
 */
async function assertFetchable(url: string): Promise<URL> {
  const parsed = new URL(url);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Refusing to fetch a ${parsed.protocol} URL`);
  }

  const addresses = await lookup(parsed.hostname, { all: true });
  if (addresses.length === 0) {
    throw new Error(`${parsed.hostname} did not resolve`);
  }
  if (addresses.some((a) => isBlockedAddress(a.address, a.family))) {
    throw new Error(`${parsed.hostname} resolves inside the private network`);
  }

  return parsed;
}

/** How many hops to follow before giving up on a source. */
const MAX_REDIRECTS = 3;

/**
 * Pulls the readable text out of a news article page.
 *
 * No HTML parser is pulled in for this — scripts and styles are stripped and
 * tags are collapsed with regex, which is coarse but good enough raw material
 * for Claude to work from. A slow, unreachable, or refused source cannot be
 * allowed to hang report generation, so the fetch is bounded and any failure
 * falls back to an empty string rather than throwing.
 */
async function fetchArticleText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    let target = await assertFetchable(url);
    let res: Response;

    /*
     * Redirects are followed by hand so every hop is re-checked. Letting fetch
     * follow them would validate only the first address, and a public host is
     * perfectly free to answer with a 302 to 169.254.169.254 — by then the
     * check has already passed.
     */
    for (let hop = 0; ; hop++) {
      res = await fetch(target, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; HarekarReportBot/1.0)",
        },
      });

      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) break;
      if (hop >= MAX_REDIRECTS) return "";

      target = await assertFetchable(new URL(location, target).toString());
    }

    if (!res.ok) return "";

    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
  } catch (error) {
    /*
     * Logged rather than swallowed silently: an operator whose source came back
     * blank needs some way to tell "the site was slow" from "that address was
     * refused", and the draft itself only ever says no content was retrieved.
     */
    console.warn(`Could not read source ${url}`, error);
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — add it to .env to draft report items.",
    );
  }
  return new Anthropic({ apiKey });
}

const RETURN_ITEMS_TOOL = {
  name: "return_report_items",
  description:
    "Return the finished write-up for every news item, in the same order they were given.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: {
              type: "string",
              description: "A short bold headline for the item.",
            },
            body: {
              type: "string",
              description:
                "One tight, factual paragraph in the neutral third-person register of a security bulletin — no speculation, no editorialising.",
            },
          },
          required: ["title", "body"],
        },
      },
    },
    required: ["items"],
  },
};

/**
 * Turns curated raw articles into report-ready write-ups.
 *
 * Selection stays human: the admin picks which stories go in and which
 * region each belongs to. Claude's job is narrower — read the source
 * material and write it up in the register the daily report already uses.
 * Keeping the model out of the "is this newsworthy" decision is deliberate
 * for a security bulletin: a wrong inclusion is a judgement error, not a
 * writing error, and that judgement stays with the analyst.
 */
export async function draftReportItems(
  raw: RawNewsInput[],
): Promise<ReportNewsItem[]> {
  const sourced = await Promise.all(
    raw.map(async (item) => ({
      ...item,
      text: item.notes.trim() || (await fetchArticleText(item.url)),
    })),
  );

  const prompt = sourced
    .map((item, i) => {
      const body =
        item.text ||
        "(no content could be retrieved — write from the URL and region alone, keep it brief)";
      return `Item ${i + 1} (${item.region}, source: ${item.url || "none"}):\n${body}`;
    })
    .join("\n\n---\n\n");

  const anthropic = anthropicClient();

  /*
   * Headroom scales with the batch. A fixed 4096 was ample for the three or
   * four items an ordinary day carries and quietly too small for a busy one —
   * and a truncated response here is not a shorter draft, it is a JSON document
   * torn off mid-string that no longer parses into items at all.
   *
   * The base is deliberately generous rather than tuned: `max_tokens` is a
   * ceiling, not a reservation, so an unused allowance costs nothing while a
   * cramped one costs the analyst a failed run.
   */
  const maxTokens = Math.min(16_000, 2_048 + sourced.length * 512);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: maxTokens,
    system:
      "You write items for Harekar Group's Daily Security Report, a bulletin read by a private security company's operations team covering Kurdistan and Iraq. Match the register of a professional security bulletin: factual, concise, third person, no speculation or commentary. Each item is a short bold headline followed by one tight paragraph.",
    tools: [RETURN_ITEMS_TOOL],
    tool_choice: { type: "tool", name: "return_report_items" },
    messages: [{ role: "user", content: prompt }],
  });

  /*
   * Why `stop_reason` is read before the content: a run that hit the ceiling
   * still returns a `tool_use` block, just an incomplete one. Discovering that
   * downstream produces a confusing shape error instead of the one sentence
   * that actually helps the analyst — split the batch.
   */
  if (message.stop_reason === "max_tokens") {
    throw new Error(
      `The draft was cut off at ${maxTokens} tokens. Generate fewer items at once.`,
    );
  }
  if (message.stop_reason === "refusal") {
    throw new Error(
      "Claude declined to write up this material. These items need drafting by hand.",
    );
  }

  const toolUse = message.content.find(
    (block) => block.type === "tool_use",
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a structured draft");
  }

  const drafted = (toolUse.input as { items?: unknown }).items;
  if (!Array.isArray(drafted)) {
    throw new Error("Claude's draft did not contain a list of items");
  }

  /*
   * Every write-up is paired with its source by position, so a count mismatch
   * does not mean one missing item — it means every item after the gap is
   * attributed to the wrong article.
   *
   * This used to walk the model's array and index into the inputs, which threw
   * a TypeError on an extra item and, worse, would have silently stamped the
   * wrong source URL and region onto each remaining write-up if one came back
   * short. Walking the *inputs* and refusing a mismatch outright is the only
   * arrangement that cannot mislabel: in a security bulletin, an assessment
   * credited to an article it did not come from is a worse outcome than no
   * draft at all.
   */
  if (drafted.length !== sourced.length) {
    throw new Error(
      `Claude returned ${drafted.length} write-ups for ${sourced.length} news items. Nothing was drafted — try again.`,
    );
  }

  return sourced.map((source, i) => {
    const item = drafted[i] as { title?: unknown; body?: unknown };
    const title = typeof item?.title === "string" ? item.title.trim() : "";
    const body = typeof item?.body === "string" ? item.body.trim() : "";

    // `required` in the tool schema is a strong steer, not a guarantee.
    if (!title || !body) {
      throw new Error(
        `Item ${i + 1} came back without a title or body. Nothing was drafted — try again.`,
      );
    }

    return { title, body, url: source.url || null, region: source.region };
  });
}
