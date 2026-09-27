"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { acceptGuestInvite, type JoinState } from "./actions";

const initialState: JoinState = { status: "idle" };

/**
 * Sets a name and a password for a brand-new guest account — the one branch
 * of accepting an invite that needs a form at all; an email that already has
 * an account skips this entirely (see the join page).
 */
export default function JoinForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const t = useTranslations("auth.join");
  const locale = useLocale();
  const [state, formAction] = useActionState(acceptGuestInvite, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />

      <div>
        <span className="text-bone/70 mb-2 block text-xs tracking-[0.2em] uppercase">
          {t("email")}
        </span>
        <p dir="ltr" className="text-bone border-bone/16 bg-ink/30 rounded-xl border px-4 py-3 text-start text-base">
          {email}
        </p>
      </div>

      <Field name="name" type="text" label={t("name")} autoComplete="name" required />
      <Field
        name="password"
        type="password"
        label={t("password")}
        autoComplete="new-password"
        hint={t("passwordHint")}
        required
      />
      <Field
        name="confirmPassword"
        type="password"
        label={t("confirmPassword")}
        autoComplete="new-password"
        required
      />

      {state.status === "error" && state.errorKey && (
        <p
          role="alert"
          className="border-status-critical/40 bg-status-critical/10 text-status-critical rounded-xl border px-4 py-3 text-sm"
        >
          {t(state.errorKey)}
        </p>
      )}

      <Submit label={t("submit")} />
    </form>
  );
}

function Field({
  name,
  type,
  label,
  autoComplete,
  hint,
  required,
}: {
  name: string;
  type: string;
  label: string;
  autoComplete: string;
  hint?: string;
  required?: boolean;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="text-bone/70 mb-2 block text-xs tracking-[0.2em] uppercase">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={hintId}
        className="border-bone/20 bg-ink/40 text-bone focus:border-gold focus:ring-gold/30 w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:ring-2"
      />
      {hint && (
        <p id={hintId} className="text-bone/50 mt-2 text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright min-h-12 w-full cursor-pointer rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
