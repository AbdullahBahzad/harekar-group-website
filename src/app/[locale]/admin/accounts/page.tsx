import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/entitlement";
import { formatDate } from "@/lib/admin-format";
import Panel from "@/components/admin/Panel";
import OperatorPanel from "@/components/admin/OperatorPanel";
import { orPreview, sampleUsers } from "@/lib/admin-preview";
import { grantProPeriod, toggleUserAdmin, toggleUserPro } from "./actions";

export default async function AccountsStation({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const operator = await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  const { data: users } = await orPreview(
    () => prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      isPro: true,
      isAdmin: true,
      proUntil: true,
      createdAt: true,
      orders: {
        where: { status: "PAID" },
        select: { amountMinor: true, currency: true },
      },
    },
    }),
    sampleUsers,
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-bone text-3xl font-light">
          {t("accounts.title")}
        </h1>
        <p className="text-bone/55 mt-2 max-w-2xl text-sm leading-relaxed">
          {t("accounts.intro", { count: users.length })}
        </p>
      </header>

      {/*
       * Operators first. It is the shortest and most consequential list on the
       * page, and burying it under three hundred customer rows would make the
       * one thing worth auditing the hardest thing to find.
       */}
      <div className="mb-5">
        <OperatorPanel
          operators={users
            .filter((user) => user.isAdmin)
            .map((user) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))}
          currentOperatorId={operator.id}
        />
      </div>

      <Panel label={t("common.register")}>
        {users.length === 0 ? (
          <p className="text-bone/50 px-5 py-10 text-center text-sm">
            {t("accounts.empty")}
          </p>
        ) : (
          <ul className="divide-bone/6 divide-y">
            {users.map((user) => {
              /*
               * Entitlement is resolved through the same helper the site uses,
               * so the console can never disagree with what the reader sees.
               */
              const entitled = hasProAccess(user);
              const isSelf = user.id === operator.id;
              const paid = user.orders.length;

              return (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-bone/90 truncate text-sm">
                      {user.name ?? "—"}
                      {isSelf && (
                        <span className="text-gold/70 ms-2 text-xs">
                          {t("common.you")}
                        </span>
                      )}
                    </p>
                    {/*
                     * `dir="ltr"` — an address is a Latin identifier, and the
                     * bidi algorithm moves its dots and @ around when it is
                     * laid out as RTL text.
                     */}
                    <p dir="ltr" className="text-bone/50 truncate text-start text-xs">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag
                      on={entitled}
                      label={
                        entitled ? t("accounts.pro") : t("accounts.standard")
                      }
                    />
                    {user.isAdmin && <Tag on label={t("accounts.console")} />}
                    {paid > 0 && (
                      <span className="text-bone/60 text-xs tabular-nums">
                        {t("accounts.paidCount", { count: paid })}
                      </span>
                    )}
                  </div>

                  {user.proUntil && (
                    <span className="text-bone/56 text-xs tabular-nums">
                      {t("accounts.until", {
                        date: formatDate(user.proUntil, locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }),
                      })}
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={toggleUserPro}>
                      <input type="hidden" name="id" value={user.id} />
                      <MiniButton>
                        {user.isPro
                          ? t("accounts.revokeComp")
                          : t("accounts.compPro")}
                      </MiniButton>
                    </form>

                    <form action={grantProPeriod}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="days" value="30" />
                      <MiniButton>
                        {t("accounts.grantDays", { days: 30 })}
                      </MiniButton>
                    </form>

                    {/*
                     * Self-demotion is blocked in the action as well; the
                     * control is hidden so a dead button is never shown.
                     */}
                    {!isSelf && (
                      <form action={toggleUserAdmin}>
                        <input type="hidden" name="id" value={user.id} />
                        <MiniButton danger={user.isAdmin}>
                          {user.isAdmin
                            ? t("accounts.removeConsole")
                            : t("accounts.grantConsole")}
                        </MiniButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Tag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`border px-2 py-0.5 text-xs ${
        on ? "border-gold/50 text-gold" : "border-bone/20 text-bone/55"
      }`}
    >
      {label}
    </span>
  );
}

function MiniButton({
  children,
  danger,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="submit"
      className={`flex min-h-11 cursor-pointer items-center border px-2.5 text-xs transition-colors ${
        danger
          ? "border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink"
          : "border-bone/20 text-bone/70 hover:border-gold hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
