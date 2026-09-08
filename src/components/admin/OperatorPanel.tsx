"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Panel from "@/components/admin/Panel";
import {
  grantAdminByEmail,
  toggleUserAdmin,
  type OperatorFormState,
} from "@/app/[locale]/admin/accounts/actions";

const initialState: OperatorFormState = { status: "idle" };

export type Operator = {
  id: string;
  name: string | null;
  email: string;
};

/**
 * Who can open the console.
 *
 * Separated from the general account register because these two lists answer
 * different questions. The register is "who are our customers"; this is "who
 * holds the keys" — a much shorter list that someone should be able to audit
 * at a glance without scrolling past three hundred subscribers.
 */
export default function OperatorPanel({
  operators,
  currentOperatorId,
}: {
  operators: Operator[];
  currentOperatorId: string;
}) {
  const t = useTranslations("admin");
  const [state, formAction] = useActionState(grantAdminByEmail, initialState);

  return (
    <Panel label={t("operators.title")} tone="critical">
      <div className="space-y-5 p-5">
        <p className="text-bone/55 text-sm leading-relaxed">
          {t("operators.intro")}
        </p>

        <form action={formAction} className="flex flex-wrap gap-2">
          {/* Latin identifiers — kept LTR whatever the console's language. */}
          <input
            type="email"
            name="email"
            dir="ltr"
            required
            defaultValue={state.email ?? ""}
            placeholder={t("operators.emailPlaceholder")}
            aria-label={t("operators.emailLabel")}
            autoComplete="off"
            className="border-bone/16 bg-ink/60 text-bone focus:border-gold min-w-0 flex-1 border px-3 py-2 text-start text-xs outline-none transition-colors"
          />
          <input
            type="password"
            name="password"
            dir="ltr"
            required
            minLength={8}
            placeholder={t("operators.passwordPlaceholder")}
            aria-label={t("operators.passwordLabel")}
            autoComplete="new-password"
            className="border-bone/16 bg-ink/60 text-bone focus:border-gold min-w-0 flex-1 border px-3 py-2 text-start text-xs outline-none transition-colors"
          />
          <GrantButton />
        </form>

        <p className="text-bone/56 text-xs leading-relaxed">
          {t("operators.passwordHint")}
        </p>

        {/*
         * `role="status"` so the outcome is announced. This form's whole
         * result is a sentence — a sighted user sees it appear, and without
         * this a screen reader user gets nothing at all.
         */}
        {state.status !== "idle" && state.messageKey && (
          <p
            role="status"
            className={`border px-3 py-2 text-xs leading-relaxed ${
              state.status === "error"
                ? "border-status-critical/40 bg-status-critical/10 text-status-critical"
                : "border-status-clear/40 bg-status-clear/10 text-status-clear"
            }`}
          >
            {t(`operators.${state.messageKey}`, state.values)}
          </p>
        )}

        <ul className="divide-bone/6 border-bone/12 divide-y border-t pt-1">
          {operators.map((operator) => {
            const isSelf = operator.id === currentOperatorId;

            return (
              <li
                key={operator.id}
                className="flex flex-wrap items-center gap-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="bg-gold/60 size-1.5 shrink-0 rounded-full"
                />

                <span className="min-w-0 flex-1">
                  <span className="text-bone/90 block truncate text-sm">
                    {operator.name ?? "—"}
                    {isSelf && (
                      <span className="text-gold/70 ms-2 text-xs">
                        {t("common.you")}
                      </span>
                    )}
                  </span>
                  <span dir="ltr" className="text-bone/50 block truncate text-start text-xs">
                    {operator.email}
                  </span>
                </span>

                {/*
                 * No control on your own row. Revoking your own access is
                 * almost always a misclick, and on a single-operator
                 * deployment it locks the console permanently — the action
                 * refuses it too, so this only hides a button that would fail.
                 */}
                {isSelf ? (
                  <span className="text-bone/52 text-xs">
                    {t("operators.locked")}
                  </span>
                ) : (
                  <form action={toggleUserAdmin}>
                    <input type="hidden" name="id" value={operator.id} />
                    <button
                      type="submit"
                      className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink flex min-h-11 cursor-pointer items-center border px-3 text-xs transition-colors"
                    >
                      {t("operators.revoke")}
                    </button>
                  </form>
                )}
              </li>
            );
          })}

          {operators.length === 0 && (
            <li className="text-bone/50 py-4 text-sm">
              {t("operators.empty")}
            </li>
          )}
        </ul>
      </div>
    </Panel>
  );
}

/** Disabled while in flight, so a slow lookup cannot be submitted twice. */
function GrantButton() {
  const t = useTranslations("admin.operators");
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright shrink-0 cursor-pointer px-4 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? t("checking") : t("grant")}
    </button>
  );
}
