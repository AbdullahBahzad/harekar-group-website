"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AuthFormState } from "./actions";

const initialState: AuthFormState = { status: "idle" };

type Mode = "login" | "register";

/**
 * The sign-in and registration form.
 *
 * One component for both because they differ by two fields and their labels;
 * two near-identical forms would drift apart the first time a shared detail —
 * autocomplete hints, error placement, the disabled state — was changed in one
 * and not the other.
 */
export default function AuthForm({
  mode,
  action,
  next,
}: {
  mode: Mode;
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  /** Where to land after signing in; validated server-side before use. */
  next?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction] = useActionState(action, initialState);
  const registering = mode === "register";

  return (
    <form action={formAction} className="space-y-5">
      {/* Where to land after sign-in. Both validated server-side before use. */}
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      {registering && (
        <Field
          name="name"
          type="text"
          label={t("name")}
          autoComplete="name"
          defaultValue={state.values?.name}
          required
        />
      )}

      <Field
        name="email"
        type="email"
        label={t("email")}
        autoComplete="email"
        defaultValue={state.values?.email}
        required
      />

      <Field
        name="password"
        type="password"
        label={t("password")}
        autoComplete={registering ? "new-password" : "current-password"}
        hint={registering ? t("passwordHint") : undefined}
        required
      />

      {registering && (
        <Field
          name="confirmPassword"
          type="password"
          label={t("confirmPassword")}
          autoComplete="new-password"
          required
        />
      )}

      {/*
       * `role="alert"` so the message is announced rather than only seen — a
       * failed sign-in is exactly the moment a screen reader user is left
       * guessing whether anything happened.
       */}
      {state.status === "error" && state.error && (
        <p
          role="alert"
          className="border-status-critical/40 bg-status-critical/10 text-status-critical rounded-xl border px-4 py-3 text-sm"
        >
          {t(state.error)}
        </p>
      )}

      <Submit label={registering ? t("createAccount") : t("signIn")} />

      <p className="text-bone/50 pt-2 text-center text-sm">
        {registering ? t("haveAccount") : t("noAccount")}{" "}
        <Link
          href={registering ? "/login" : "/register"}
          className="text-gold hover:text-gold-bright underline underline-offset-4 transition-colors"
        >
          {registering ? t("signIn") : t("createAccount")}
        </Link>
      </p>
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
  defaultValue,
}: {
  name: string;
  type: string;
  label: string;
  autoComplete: string;
  hint?: string;
  required?: boolean;
  /** Echoed back after a rejected submit; see `values` on the action state. */
  defaultValue?: string;
}) {
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    <div>
      {/* A real label, not a placeholder: placeholders vanish on focus and
          leave the user with an unlabelled box. */}
      <label
        htmlFor={name}
        className="text-bone/70 mb-2 block text-xs tracking-[0.2em] uppercase"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        aria-describedby={hintId}
        className="border-bone/15 bg-ink/40 text-bone focus:border-gold focus:ring-gold/30 w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:ring-2"
      />
      {hint && (
        <p id={hintId} className="text-bone/40 mt-2 text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Submit button, disabled while the action is in flight.
 *
 * Split out because `useFormStatus` only reports the status of the form it is
 * rendered *inside* — read from the parent it would always return idle, and
 * double submissions would sail through.
 */
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright w-full cursor-pointer rounded-full px-8 py-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
