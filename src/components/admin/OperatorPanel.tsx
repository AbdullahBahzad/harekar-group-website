"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
  const [state, formAction] = useActionState(grantAdminByEmail, initialState);

  return (
    <Panel label="Operators" tone="critical">
      <div className="space-y-5 p-5">
        <p className="text-bone/45 text-sm leading-relaxed">
          Console access is granted to accounts that already exist. Ask the
          person to register on the site first, then add them by email.
        </p>

        <form action={formAction} className="flex flex-wrap gap-2">
          <input
            type="email"
            name="email"
            required
            defaultValue={state.email ?? ""}
            placeholder="name@harekargroup.com"
            aria-label="Email address"
            autoComplete="off"
            className="border-bone/12 bg-ink/60 text-bone focus:border-gold min-w-0 flex-1 border px-3 py-2 text-xs outline-none transition-colors"
          />
          <GrantButton />
        </form>

        {/*
         * `role="status"` so the outcome is announced. This form's whole
         * result is a sentence — a sighted user sees it appear, and without
         * this a screen reader user gets nothing at all.
         */}
        {state.status !== "idle" && state.message && (
          <p
            role="status"
            className={`border px-3 py-2 text-xs leading-relaxed ${
              state.status === "error"
                ? "border-status-critical/40 bg-status-critical/10 text-status-critical"
                : "border-status-clear/40 bg-status-clear/10 text-status-clear"
            }`}
          >
            {state.message}
          </p>
        )}

        <ul className="divide-bone/6 border-bone/8 divide-y border-t pt-1">
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
                      <span className="text-gold/60 ms-2 text-xs">
                        you
                      </span>
                    )}
                  </span>
                  <span className="text-bone/40 block truncate text-xs">
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
                  <span className="text-bone/25 text-xs">
                    locked
                  </span>
                ) : (
                  <form action={toggleUserAdmin}>
                    <input type="hidden" name="id" value={operator.id} />
                    <button
                      type="submit"
                      className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink cursor-pointer border px-3 py-1 text-xs transition-colors"
                    >
                      Revoke
                    </button>
                  </form>
                )}
              </li>
            );
          })}

          {operators.length === 0 && (
            <li className="text-bone/40 py-4 text-sm">
              No operators. That should be impossible — you are reading this.
            </li>
          )}
        </ul>
      </div>
    </Panel>
  );
}

/** Disabled while in flight, so a slow lookup cannot be submitted twice. */
function GrantButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-gold text-ink hover:bg-gold-bright shrink-0 cursor-pointer px-4 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Checking…" : "Grant access"}
    </button>
  );
}
