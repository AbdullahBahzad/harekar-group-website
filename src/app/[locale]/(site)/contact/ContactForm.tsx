"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitContactForm, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

const fieldClass =
  "border-bone/20 bg-ink/60 text-bone placeholder:text-bone/52 focus:border-gold rounded-lg border px-4 py-3 text-sm outline-none transition-colors";

export default function ContactForm() {
  const t = useTranslations("contact.form");
  const tCta = useTranslations("cta");
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState,
  );

  return (
    <form action={formAction} className="mt-12 flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-bone/70 text-sm">
          {t("name")}
        </label>
        <input id="name" name="name" type="text" required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="organization" className="text-bone/70 text-sm">
          {t("organization")}
        </label>
        <input
          id="organization"
          name="organization"
          type="text"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-bone/70 text-sm">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-bone/70 text-sm">
          {t("phone")}
        </label>
        <input id="phone" name="phone" type="tel" className={fieldClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-bone/70 text-sm">
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-gold text-ink hover:bg-gold-bright mt-3 self-start rounded-full px-8 py-3 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {pending ? t("sending") : tCta("primary")}
      </button>

      {state.status === "success" && (
        <p className="text-gold-bright text-sm">{t("success")}</p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-red-400">{t(state.error ?? "errorGeneric")}</p>
      )}
    </form>
  );
}
