"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { askQuestion, type AskState } from "@/app/[locale]/portal/ask/actions";

const initialState: AskState = { status: "idle" };

const SUGGESTIONS_COUNT = 3;

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
  const [state, formAction] = useActionState(askQuestion, initialState);
  const [question, setQuestion] = useState("");

  const suggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
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
        <textarea
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("placeholder")}
          rows={3}
          maxLength={600}
          className="border-bone/16 bg-ink/60 text-bone placeholder:text-bone/35 focus:border-gold w-full resize-y rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
        />
        <SubmitButton label={t("submit")} pendingLabel={t("thinking")} />
      </form>

      {state.status === "idle" && (
        <div className="mt-6 flex flex-wrap gap-2">
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setQuestion(text)}
              className="border-bone/16 text-bone/65 hover:border-gold/50 hover:text-gold cursor-pointer rounded-full border px-4 py-2 text-xs transition-colors"
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
          <p className="text-gold/70 text-xs tracking-[0.14em] uppercase">
            {state.question}
          </p>
          <p className="text-bone/85 mt-3 text-sm leading-relaxed whitespace-pre-line text-pretty">
            {state.answer}
          </p>
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
