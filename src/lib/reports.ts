import Anthropic from "@anthropic-ai/sdk";
import { safeFetchText } from "@/lib/safe-fetch";
import { extractArticleText } from "@/lib/article-extract";
import type { RawNewsInput, ReportNewsItem } from "@/lib/report-shape";

/*
 * The vocabulary lives in `report-shape.ts` so the client console can read it
 * without dragging this module — and the Anthropic SDK with it — into the
 * browser bundle. Re-exported here so existing server-side importers are
 * unaffected.
 */
export {
  THREAT_LEVELS,
  REGIONS,
  type ThreatLevel,
  type Region,
  type ReportNewsItem,
  type ReportContent,
  type RawNewsInput,
} from "@/lib/report-shape";

/**
 * Pulls the readable text out of a news article page — the article's own
 * paragraphs, not the nav bar and sidebar widgets around them. See
 * `article-extract.ts` for how that separation is made.
 *
 * Used both as raw material for Claude to work from, and, via
 * `pullHeadlineItems` in the sources actions, as a report body in its own
 * right when there is no `ANTHROPIC_API_KEY` to rewrite it. The fetch itself
 * is SSRF-guarded and never throws — see `safe-fetch.ts` — so a slow or
 * refused source just yields an empty string here rather than failing the
 * whole batch.
 */
export async function fetchArticleText(url: string): Promise<string> {
  const html = await safeFetchText(url);
  if (!html) return "";
  return extractArticleText(html);
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
    model: "claude-opus-4-8",
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
