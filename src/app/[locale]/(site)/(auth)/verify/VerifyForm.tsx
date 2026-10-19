"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import {
  resendVerificationCode,
  verifyEmailCode,
  type VerifyFormState,
} from "../actions";

const initialState: VerifyFormState = { status: "idle" };

/**
 * Type the 6-digit code; or ask for a new one. Two forms, two actions, so a
 * resend never submits a half-typed code and a wrong code never triggers a
 * resend.
 */
export default function VerifyForm({ email, next }: { email: string; next?: string }) {
  const t = useTranslations("auth.verify");
  const locale = useLocale();
  const [state, verify] = useActionState(verifyEmailCode, initialState);
  const [resent, resend] = useActionState(resendVerificationCode, initialState);

  return (
    <div className="space-y-6">
      <form action={verify} className="space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={email} />
        {next && <input type="hidden" name="next" value={next} />}

        <label className="block">
          <span className="text-bone/80 mb-2 block text-sm font-semibold">{t("codeLabel")}</span>
          {/*
           * `one-time-code` lets phones offer the code straight from the
           * email; `numeric` brings up the number pad. LTR in every language:
           * the code is six digits, read left to right.
           */}
          <input
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            dir="ltr"
            placeholder="000000"
            className="border-bone/20 text-bone focus:border-gold focus:ring-gold/30 w-full rounded-xl border bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] tabular-nums outline-none transition-colors focus:ring-2"
          />
        </label>

        {state.status === "error" && state.error && (
          <p
            role="alert"
            className="border-status-critical/40 bg-status-critical/10 text-status-critical rounded-xl border px-4 py-3 text-sm"
          >
            {t(state.error)}
          </p>
        )}

        <Submit label={t("confirm")} />
      </form>

      <form action={resend} className="border-bone/10 border-t pt-5 text-center">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={email} />
        <p className="text-bone/60 text-sm">{t("noCode")}</p>
        <ResendButton label={t("resend")} />
        {resent.status === "sent" && (
          <p role="status" className="text-status-clear mt-2 text-sm">
            {t("resent")}
          </p>
        )}
        {resent.status === "error" && (
          <p role="alert" className="text-status-critical mt-2 text-sm">
            {t(resent.error === "errorTooMany" ? "errorResendTooSoon" : "errorGeneric")}
          </p>
        )}
      </form>
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright w-full cursor-pointer rounded-full px-8 py-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ResendButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-gold-deep hover:text-bone mt-2 cursor-pointer text-sm font-semibold underline underline-offset-4 transition-colors disabled:opacity-50"
    >
      {label}
    </button>
  );
}
