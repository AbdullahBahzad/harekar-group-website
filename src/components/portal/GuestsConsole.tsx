"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import {
  inviteGuest,
  revokeGuest,
  type InviteGuestState,
} from "@/app/[locale]/portal/guests/actions";
import type { PortalGuestRow } from "@/lib/portal/guests";
import { formatDate } from "@/lib/portal/format";
import { cn } from "@/lib/utils";

const initialState: InviteGuestState = { status: "idle" };

const statusTone: Record<PortalGuestRow["status"], string> = {
  PENDING: "border-status-elevated/40 text-status-elevated",
  ACCEPTED: "border-status-clear/40 text-status-clear",
  REVOKED: "border-bone/20 text-bone/45",
};

/**
 * Seats a Pro account has handed to colleagues — invite by email, see who
 * has accepted, revoke a seat that should not have it any more.
 */
export default function GuestsConsole({ guests }: { guests: PortalGuestRow[] }) {
  const t = useTranslations("portal.guests");
  const locale = useLocale();
  const [state, formAction] = useActionState(inviteGuest, initialState);
  const [isRevoking, startRevoke] = useTransition();

  function handleRevoke(id: string) {
    startRevoke(async () => {
      const formData = new FormData();
      formData.set("id", id);
      await revokeGuest(formData);
    });
  }

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

      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          type="email"
          name="email"
          dir="ltr"
          required
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailPlaceholder")}
          className="border-bone/16 bg-ink/60 text-bone focus:border-gold min-w-0 flex-1 rounded-lg border px-3 py-2 text-start text-sm outline-none transition-colors"
        />
        <InviteButton label={t("invite")} pendingLabel={t("inviting")} />
      </form>

      {state.status !== "idle" && (
        <p
          role="status"
          className={cn(
            "mt-3 text-sm",
            state.status === "error" ? "text-status-critical" : "text-status-clear",
          )}
        >
          {state.status === "invited"
            ? t("invited", { email: state.email ?? "" })
            : t(state.errorKey ?? "errorGeneric")}
        </p>
      )}

      <ul className="border-bone/14 divide-bone/10 mt-8 divide-y rounded-2xl border">
        {guests.length === 0 && (
          <li className="text-bone/50 px-5 py-8 text-center text-sm">
            {t("empty")}
          </li>
        )}
        {guests.map((guest) => (
          <li key={guest.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span dir="ltr" className="text-bone min-w-0 flex-1 truncate text-start text-sm">
              {guest.email}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] tracking-wide uppercase",
                statusTone[guest.status],
              )}
            >
              {t(`status${guest.status}`)}
            </span>
            <span className="text-bone/45 shrink-0 text-xs tabular-nums">
              {formatDate(new Date(guest.acceptedAt ?? guest.invitedAt), locale, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {guest.status !== "REVOKED" && (
              <button
                type="button"
                onClick={() => handleRevoke(guest.id)}
                disabled={isRevoking}
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink flex min-h-9 shrink-0 cursor-pointer items-center rounded-full border px-3 text-xs transition-colors disabled:opacity-40"
              >
                {t("revoke")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InviteButton({
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
      className="bg-gold text-ink hover:bg-gold-bright flex min-h-11 shrink-0 cursor-pointer items-center rounded-full px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
