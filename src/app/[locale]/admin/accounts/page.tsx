import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/entitlement";
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
        <h1 className="font-display text-bone text-3xl font-light">Accounts</h1>
        <p className="text-bone/45 mt-2 max-w-2xl text-sm leading-relaxed">
          Registered accounts, entitlement and console access. {users.length} on
          file.
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

      <Panel label="Register" index="06">
        {users.length === 0 ? (
          <p className="text-bone/40 px-5 py-10 text-center text-sm">
            No accounts yet.
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
                        <span className="text-gold/60 ms-2 font-mono text-[10px] tracking-[0.16em] uppercase">
                          you
                        </span>
                      )}
                    </p>
                    <p className="text-bone/40 truncate font-mono text-[11px]">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tag on={entitled} label={entitled ? "Pro" : "Standard"} />
                    {user.isAdmin && <Tag on label="Console" />}
                    {paid > 0 && (
                      <span className="text-bone/35 font-mono text-[10px] tabular-nums">
                        {paid} paid
                      </span>
                    )}
                  </div>

                  {user.proUntil && (
                    <span className="text-bone/30 font-mono text-[10px] tabular-nums">
                      until {user.proUntil.toISOString().slice(0, 10)}
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={toggleUserPro}>
                      <input type="hidden" name="id" value={user.id} />
                      <MiniButton>
                        {user.isPro ? "Revoke comp" : "Comp Pro"}
                      </MiniButton>
                    </form>

                    <form action={grantProPeriod}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="days" value="30" />
                      <MiniButton>+30d</MiniButton>
                    </form>

                    {/*
                     * Self-demotion is blocked in the action as well; the
                     * control is hidden so a dead button is never shown.
                     */}
                    {!isSelf && (
                      <form action={toggleUserAdmin}>
                        <input type="hidden" name="id" value={user.id} />
                        <MiniButton danger={user.isAdmin}>
                          {user.isAdmin ? "Remove console" : "Grant console"}
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
      className={`border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase ${
        on ? "border-gold/40 text-gold" : "border-bone/15 text-bone/45"
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
      className={`cursor-pointer border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors ${
        danger
          ? "border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink"
          : "border-bone/15 text-bone/60 hover:border-gold hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}
