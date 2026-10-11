"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitContactForm, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

const fieldClass =
  "border-bone/20 bg-white text-bone placeholder:text-bone/52 focus:border-gold focus:ring-gold/30 min-h-12 rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:ring-2";

export default function ContactForm() {
  const t = useTranslations("contact.form");
  const tCta = useTranslations("cta");
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-bone/80 text-sm font-semibold">
          {t("name")}
        </label>
        <input id="name" name="name" type="text" required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="organization" className="text-bone/80 text-sm font-semibold">
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
        <label htmlFor="email" className="text-bone/80 text-sm font-semibold">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required className={fieldClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phone" className="text-bone/80 text-sm font-semibold">
          {t("phone")}
        </label>
        <input id="phone" name="phone" type="tel" className={fieldClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-bone/80 text-sm font-semibold">
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
        className="bg-gold text-ink hover:bg-gold-bright mt-3 inline-flex min-h-12 cursor-pointer items-center self-start rounded-full px-8 text-base font-bold transition-colors disabled:opacity-50"
      >
        {pending ? t("sending") : tCta("primary")}
      </button>

      {state.status === "success" && (
        <p className="text-sm font-semibold text-[#1f6b47]">{t("success")}</p>
      )}
      {state.status === "error" && (
        <p className="text-sm font-semibold text-[#b3261e]">{t(state.error ?? "errorGeneric")}</p>
      )}
    </form>
  );
}
