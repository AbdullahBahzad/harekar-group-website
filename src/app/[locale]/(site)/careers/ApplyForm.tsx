"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { submitApplication, type ApplyFormState } from "./actions";

const initialState: ApplyFormState = { status: "idle" };

/** Keep in sync with MAX_CV_BYTES in actions.ts. */
const MAX_CV_BYTES = 5 * 1024 * 1024;
const CV_ACCEPT = ".pdf,.doc,.docx";
const CV_EXTENSIONS = [".pdf", ".doc", ".docx"];

const fieldClass =
  "border-bone/15 bg-ink/60 text-bone placeholder:text-bone/25 focus:border-gold focus-visible:ring-gold/30 min-h-11 rounded-lg border px-4 py-3 text-base outline-none transition-colors focus-visible:ring-2 sm:text-sm";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-bone/70 text-sm">
        {label}
        <span className="text-gold/70 ms-1" aria-hidden>
          *
        </span>
      </label>
      {children}
    </div>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="text-bone/45 mb-6 text-xs tracking-[0.28em] uppercase">
      {children}
    </legend>
  );
}

export default function ApplyForm() {
  const t = useTranslations("careers.apply");
  const format = useFormatter();
  const [state, formAction, pending] = useActionState(
    submitApplication,
    initialState,
  );

  const [cv, setCv] = useState<File | null>(null);
  /** Client-side CV rejection, shown before the round trip. */
  const [cvError, setCvError] = useState<string | null>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /*
   * A server-side rejection scrolls past the viewport on a form this long, so
   * the error is pulled into view. Focus is not stolen — the live region
   * announces it, and moving focus backwards mid-form is more disruptive than
   * the scroll.
   */
  useEffect(() => {
    if (state.status === "error") {
      errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [state]);

  function handleCvChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setCv(null);
      setCvError(null);
      return;
    }

    const lower = file.name.toLowerCase();
    if (!CV_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setCv(null);
      setCvError("errorCvType");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setCv(null);
      setCvError("errorCvSize");
      event.target.value = "";
      return;
    }

    setCv(file);
    setCvError(null);
  }

  function removeCv() {
    setCv(null);
    setCvError(null);
    if (cvInputRef.current) cvInputRef.current.value = "";
    cvInputRef.current?.focus();
  }

  if (state.status === "success") {
    return (
      <div
        className="border-gold/25 bg-gold/[0.04] rounded-2xl border p-8 sm:p-10"
        role="status"
      >
        <svg
          viewBox="0 0 24 24"
          className="text-gold h-8 w-8"
          fill="none"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8.2 12.3l2.6 2.6 5-5.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3 className="font-display text-bone mt-5 text-2xl font-light">
          {t("successTitle")}
        </h3>
        <p className="text-bone/60 mt-3 text-sm leading-relaxed">{t("success")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="border-gold/50 text-gold hover:bg-gold hover:text-ink mt-7 min-h-11 cursor-pointer rounded-full border px-6 text-sm transition-colors"
        >
          {t("again")}
        </button>
      </div>
    );
  }

  const activeError = cvError ?? (state.status === "error" ? state.error : null);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate={false}
      className="border-bone/10 bg-surface/15 rounded-2xl border p-6 sm:p-10"
    >
      <p className="text-bone/40 text-xs">{t("requiredHint")}</p>

      <fieldset className="mt-8 border-0 p-0">
        <Legend>{t("aboutYouLegend")}</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label={t("name")}>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className={fieldClass}
            />
          </Field>
          <Field id="email" label={t("email")}>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className={fieldClass}
            />
          </Field>
          <Field id="phone" label={t("phone")}>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              className={fieldClass}
            />
          </Field>
          <Field id="city" label={t("city")}>
            <input
              id="city"
              name="city"
              type="text"
              required
              autoComplete="address-level2"
              className={fieldClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="address" label={t("address")}>
              <input
                id="address"
                name="address"
                type="text"
                required
                autoComplete="street-address"
                className={fieldClass}
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <div className="bg-bone/10 my-9 h-px" />

      <fieldset className="border-0 p-0">
        <Legend>{t("roleLegend")}</Legend>
        <div className="grid gap-5">
          <Field id="position" label={t("position")}>
            <input
              id="position"
              name="position"
              type="text"
              required
              className={fieldClass}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <label htmlFor="coverLetter" className="text-bone/70 text-sm">
              {t("coverLetter")}
              <span className="text-gold/70 ms-1" aria-hidden>
                *
              </span>
            </label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              rows={6}
              required
              aria-describedby="coverLetter-hint"
              className={fieldClass}
            />
            <p id="coverLetter-hint" className="text-bone/40 text-xs">
              {t("coverLetterHint")}
            </p>
          </div>

          {/* CV upload. The real input stays in the DOM (and keeps `required`
              so native validation still fires) but is visually replaced by the
              label, which is what carries the styling and the keyboard focus
              ring via focus-within. */}
          <div className="flex flex-col gap-2">
            <span className="text-bone/70 text-sm">
              {t("cv")}
              <span className="text-gold/70 ms-1" aria-hidden>
                *
              </span>
            </span>

            <label
              htmlFor="cv"
              className="border-bone/15 hover:border-gold/50 focus-within:border-gold focus-within:ring-gold/30 group flex min-h-11 cursor-pointer items-center gap-4 rounded-lg border border-dashed px-4 py-4 transition-colors focus-within:ring-2"
            >
              <svg
                viewBox="0 0 24 24"
                className="text-gold/70 group-hover:text-gold h-5 w-5 shrink-0 transition-colors"
                fill="none"
                aria-hidden
              >
                <path
                  d="M15.5 8.5l-6.1 6.1a2.4 2.4 0 003.4 3.4l6.3-6.3a4 4 0 10-5.7-5.7l-6.3 6.3a5.6 5.6 0 008 8l5.4-5.4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>

              <span className="min-w-0 flex-1">
                <span className="text-bone block truncate text-sm">
                  {cv ? cv.name : t("cvChoose")}
                </span>
                <span className="text-bone/40 mt-0.5 block text-xs">
                  {cv
                    ? format.number(cv.size / 1024, { maximumFractionDigits: 0 }) +
                      " KB"
                    : t("cvHint")}
                </span>
              </span>

              <input
                ref={cvInputRef}
                id="cv"
                name="cv"
                type="file"
                required
                accept={CV_ACCEPT}
                onChange={handleCvChange}
                className="sr-only"
              />

              <span className="text-gold/80 shrink-0 text-xs tracking-[0.2em] whitespace-nowrap uppercase">
                {cv ? t("cvReplace") : ""}
              </span>
            </label>

            {cv && (
              <button
                type="button"
                onClick={removeCv}
                className="text-bone/50 hover:text-bone min-h-11 cursor-pointer self-start text-xs underline underline-offset-4 transition-colors"
              >
                {t("cvRemove")}
              </button>
            )}
          </div>
        </div>
      </fieldset>

      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button
          type="submit"
          disabled={pending}
          className="bg-gold text-ink hover:bg-gold-bright min-h-11 cursor-pointer rounded-full px-9 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("sending") : t("submit")}
        </button>

        {/* Announced without stealing focus; also the scroll target above. */}
        <p
          ref={errorRef}
          role="alert"
          aria-live="polite"
          className="text-status-critical flex items-center gap-2 text-sm"
        >
          {activeError && (
            <>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M12 7.5v5.2M12 16.2v.6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              {t(activeError)}
            </>
          )}
        </p>
      </div>
    </form>
  );
}
