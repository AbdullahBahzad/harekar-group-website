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
 * Pulls the readable text out of a news article page.
 *
 * No HTML parser is pulled in for this — scripts and styles are stripped and
 * tags are collapsed with regex, which is coarse but good enough raw material
 * for Claude to work from. A slow or unreachable source cannot be allowed to
 * hang report generation, so the fetch is bounded and any failure just falls
 * back to an empty string rather than throwing.
 */
async function fetchArticleText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HarekarReportBot/1.0)",
      },
    });
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
  } catch {
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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system:
      "You write items for Harekar Group's Daily Security Report, a bulletin read by a private security company's operations team covering Kurdistan and Iraq. Match the register of a professional security bulletin: factual, concise, third person, no speculation or commentary. Each item is a short bold headline followed by one tight paragraph.",
    tools: [RETURN_ITEMS_TOOL],
    tool_choice: { type: "tool", name: "return_report_items" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = message.content.find(
    (block) => block.type === "tool_use",
  );
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a structured draft");
  }

  const { items } = toolUse.input as {
    items: { title: string; body: string }[];
  };

  return items.map((item, i) => ({
    title: item.title,
    body: item.body,
    url: sourced[i].url || null,
    region: sourced[i].region,
  }));
}
