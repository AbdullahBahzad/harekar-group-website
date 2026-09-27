import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

/** How many recent incidents and briefs are handed to Claude as context.
 * Bounded on purpose: this runs on every question a client types, unlike
 * the report-drafting call in `reports.ts` which runs once a day, so the
 * context has to stay cheap rather than exhaustive. */
const CONTEXT_INCIDENTS = 60;
const CONTEXT_BRIEFS = 7;

function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — Ask Harekar cannot answer without it.",
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Assembles what Claude is allowed to answer from: the recent, entitled
 * operational picture, and nothing else. Built fresh per question rather than
 * cached — a client asking about "today" is asking about whatever is true
 * right now, and a stale cache answering from yesterday's incidents would be
 * worse than the tool simply being slow.
 */
async function buildContext(): Promise<string> {
  const [incidents, briefs] = await Promise.all([
    prisma.intelMarker.findMany({
      where: { published: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: CONTEXT_INCIDENTS,
      select: {
        label: true,
        severity: true,
        headline: true,
        body: true,
        category: true,
        method: true,
        actor: true,
        target: true,
        province: true,
        occurredAt: true,
        createdAt: true,
        resolved: true,
      },
    }),
    prisma.dailyReport.findMany({
      orderBy: { date: "desc" },
      take: CONTEXT_BRIEFS,
      select: { date: true, executiveSummary: true, content: true },
    }),
  ]);

  const incidentLines = incidents.map((row) => {
    const when = (row.occurredAt ?? row.createdAt).toISOString().slice(0, 10);
    const bits = [
      when,
      row.province,
      row.severity,
      row.resolved ? "resolved" : "open",
      row.category,
      row.method,
      row.actor && `actor: ${row.actor}`,
      row.target && `target: ${row.target}`,
    ]
      .filter(Boolean)
      .join(" · ");
    const text = row.body || row.headline || row.label;
    return `- [${bits}] ${row.label}: ${text}`;
  });

  const briefLines = briefs.flatMap((report) => {
    const date = report.date.toISOString().slice(0, 10);
    const content = report.content as unknown as {
      items?: { title: string; body: string }[];
    };
    const summary =
      report.executiveSummary?.trim() ||
      content.items?.map((item) => item.title).join("; ") ||
      "";
    return [`- ${date}: ${summary}`];
  });

  return [
    "RECENT INCIDENTS (most recent first):",
    incidentLines.join("\n") || "(none recorded)",
    "",
    "RECENT DAILY BRIEF SUMMARIES (most recent first):",
    briefLines.join("\n") || "(none filed yet)",
  ].join("\n");
}

/** A key under `portal.ask` — see `AskState.errorKey` in `ask/actions.ts`,
 * which this shape mirrors so a failure translates without a raw string ever
 * crossing from this server-only module into the page. */
export type AskErrorKey =
  | "errorNotConfigured"
  | "errorRefused"
  | "errorNoAnswer"
  | "errorGeneric";

export type AskResult =
  | { status: "ok"; answer: string }
  | { status: "error"; errorKey: AskErrorKey };

/**
 * Answers one question, strictly from the recent operational picture above —
 * never from the model's own general knowledge of Iraq, which is out of date
 * the moment it was trained and not analyst-verified the way this data is.
 */
export async function askAboutIraq(question: string): Promise<AskResult> {
  const trimmed = question.trim();

  let anthropic: Anthropic;
  try {
    anthropic = anthropicClient();
  } catch (error) {
    console.error("Ask Harekar is not configured", error);
    return { status: "error", errorKey: "errorNotConfigured" };
  }

  const context = await buildContext();

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: [
        "You are Ask Harekar, a query tool inside Harekar Group's client portal for",
        "security operations teams working in Iraq and the Kurdistan Region.",
        "Answer ONLY from the CONTEXT below — Harekar's own verified incident register",
        "and daily briefs. Do not use anything else you know about Iraq: it may be out",
        "of date and is not analyst-verified the way this data is.",
        "If the context does not contain the answer, say so plainly rather than",
        "guessing. Write like a security analyst briefing a colleague: factual, direct,",
        "no hedging filler, no markdown headings. Keep it to a few sentences unless the",
        "question genuinely needs a list.",
        "",
        "CONTEXT",
        context,
      ].join("\n"),
      messages: [{ role: "user", content: trimmed }],
    });

    if (message.stop_reason === "refusal") {
      return { status: "error", errorKey: "errorRefused" };
    }

    const text = message.content.find((block) => block.type === "text");
    if (!text || text.type !== "text" || !text.text.trim()) {
      return { status: "error", errorKey: "errorNoAnswer" };
    }

    return { status: "ok", answer: text.text.trim() };
  } catch (error) {
    console.error("Ask Harekar failed", error);
    return { status: "error", errorKey: "errorGeneric" };
  }
}
