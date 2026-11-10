"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { askQuestion, type AskState } from "@/app/[locale]/portal/ask/actions";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/portal/format";

/** Status colours for a cited match, whichever scale it uses. */
const CITATION_TONE: Record<string, string> = {
  CRITICAL: "var(--color-status-critical)",
  HIGH: "var(--color-status-critical)",
  ELEVATED: "var(--color-status-elevated)",
  MEDIUM: "var(--color-status-elevated)",
  CLEAR: "var(--color-status-clear)",
  LOW: "var(--color-status-clear)",
};

const initialState: AskState = { status: "idle" };

const SUGGESTIONS_COUNT = 4;

/**
 * "Ask Harekar" — a plain question box over the recent, verified operational
 * picture (see `lib/portal/ask.ts` for exactly what it can and cannot see).
 *
 * No conversation history is kept: each question is answered on its own from
 * the latest data, and re-asking always re-reads the current picture rather
 * than replying from an earlier turn's now-stale context.
 */
export default function AskConsole() {
  const t = useTranslations("portal.ask");
  const locale = useLocale();
  const [state, formAction] = useActionState(askQuestion, initialState);
  const [question, setQuestion] = useState("");

  const suggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
    t("suggestion4"),
  ].slice(0, SUGGESTIONS_COUNT);

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("title")}
        </h1>
        <p className="text-bone/55 mt-2 text-sm leading-relaxed">
          {t("intro")}
        </p>
      </header>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <textarea
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("placeholder")}
          rows={3}
          maxLength={600}
          className="border-bone/16 bg-white text-bone placeholder:text-bone/35 focus:border-gold w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
        />
        <SubmitButton label={t("submit")} pendingLabel={t("thinking")} />
      </form>

      {(state.status === "idle" || state.status === "answered") && (
        <div className="mt-6 flex flex-wrap gap-2">
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setQuestion(text)}
              className="border-bone/16 text-bone/65 hover:border-gold/50 hover:text-gold-deep cursor-pointer rounded-full border px-4 py-2 text-xs transition-colors"
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {state.status === "error" && state.errorKey && (
        <p role="alert" className="text-status-critical mt-6 text-sm">
          {t(state.errorKey)}
        </p>
      )}

      {state.status === "answered" && (
        <div className="border-bone/14 bg-surface/20 mt-6 rounded-2xl border p-6">
          <p className="text-gold-deep/70 text-xs tracking-[0.14em] uppercase">
            {state.question}
          </p>
          <p className="text-bone/85 mt-3 text-sm leading-relaxed whitespace-pre-line text-pretty">
            {state.answer}
          </p>

          {state.citations && state.citations.length > 0 && (
            <div className="border-bone/10 mt-5 border-t pt-4">
              <p className="text-bone/55 mb-3 text-[11px] tracking-[0.14em] uppercase">{t("sources")}</p>
              <ol className="space-y-2">
                {state.citations.map((citation, i) => (
                  <li key={`${citation.href}-${i}`}>
                    <Link
                      href={citation.href}
                      className="border-bone/12 hover:border-gold/50 flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ background: CITATION_TONE[citation.severity ?? ""] ?? "var(--color-bone)", opacity: citation.severity ? 1 : 0.3 }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-bone block text-sm leading-snug">{citation.title}</span>
                        <span className="text-bone/50 mt-0.5 block text-xs">
                          {[
                            formatDate(new Date(citation.date), locale, { day: "numeric", month: "short", year: "numeric" }),
                            citation.place,
                            citation.kind === "incident" ? t("kindIncident") : t("kindEvent"),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright flex min-h-11 cursor-pointer items-center rounded-full px-7 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
