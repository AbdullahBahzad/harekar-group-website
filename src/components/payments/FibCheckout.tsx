"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cancelPayment, startCheckout } from "@/app/[locale]/(site)/pro/actions";
import type { PaymentStatus } from "@/app/api/payments/status/[orderId]/route";

const POLL_MS = 3000;

type Props = {
  orderId: string;
  planId: string;
  planName: string;
  period: string;
  amount: string;
  code: string;
  qr: string;
  appLink: string | null;
  expiresAt: string | null;
  /** Server clock at render — the countdown starts from it, so both renders agree. */
  serverNow: string;
  initialStatus: PaymentStatus;
  /** Set only for the simulated gateway in development. */
  simulateRef: string | null;
};

/**
 * The FIB payment page: QR code to scan, a button that opens the app on a
 * phone, the short code to type, a countdown to expiry — and a poll that
 * moves on by itself once the bank confirms.
 */
export default function FibCheckout(props: Props) {
  const t = useTranslations("pro.pay");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatus>(props.initialStatus);

  const expiresMs = props.expiresAt ? Date.parse(props.expiresAt) : null;
  const [now, setNow] = useState(() => Date.parse(props.serverNow));
  const remaining = expiresMs === null ? null : Math.max(0, expiresMs - now);

  // Clock: corrected for the gap between server and browser time.
  useEffect(() => {
    const skew = Date.parse(props.serverNow) - Date.now();
    const tick = () => setNow(Date.now() + skew);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [props.serverNow]);

  const poll = useCallback(async (): Promise<PaymentStatus | null> => {
    try {
      const response = await fetch(`/api/payments/status/${props.orderId}`, { cache: "no-store" });
      if (!response.ok) return null;
      const { status: next } = (await response.json()) as { status: PaymentStatus };
      setStatus(next);
      return next;
    } catch {
      return null;
    }
  }, [props.orderId]);

  // Poll while waiting; checking again at once when the tab comes back.
  useEffect(() => {
    if (status !== "pending") return;
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, poll]);

  /*
   * At zero the page shows the code as expired, but keeps polling until the
   * server agrees — a payment made in the final seconds still lands.
   */
  const expiredLocally = remaining === 0 && status === "pending";

  // Paid: a moment on the confirmation, then on to the receipt.
  useEffect(() => {
    if (status !== "paid") return;
    const timer = setTimeout(
      () => router.replace(`/pro/result?order=${props.orderId}`),
      1600,
    );
    return () => clearTimeout(timer);
  }, [status, router, props.orderId]);

  const shown: PaymentStatus = expiredLocally ? "expired" : status;
  const reference = props.orderId.slice(-8).toUpperCase();
  const windowMs = expiresMs === null ? null : expiresMs - Date.parse(props.serverNow);

  return (
    <section className="mx-auto max-w-5xl px-6 pt-12 pb-24 sm:pt-16">
      <Link
        href="/pro"
        className="text-bone/60 hover:text-gold-deep inline-flex items-center gap-2 text-sm transition-colors"
      >
        <svg viewBox="0 0 16 16" className="size-4 rtl:rotate-180" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {t("back")}
      </Link>

      <p className="text-gold-deep mt-8 text-xs font-semibold tracking-[0.3em] uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-display text-bone mt-4 text-4xl leading-[1.15] font-bold sm:text-5xl">
        {t("title")}
      </h1>
      <p className="text-bone/70 mt-4 max-w-xl text-base leading-relaxed text-pretty">
        {t("subtitle")}
      </p>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── The payment itself: first on a phone, right-hand on desktop ── */}
        <div className="border-bone/12 rounded-3xl border bg-white p-6 shadow-[0_24px_60px_-30px_rgba(22,22,22,0.35)] sm:p-8 lg:order-2">
          <StatusBar status={shown} remaining={remaining} windowMs={windowMs} />

          {props.appLink && shown === "pending" && (
            <a
              href={props.appLink}
              className="bg-ink hover:bg-ink/90 mt-6 flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-colors lg:hidden"
            >
              <PhoneIcon />
              {t("openApp")}
            </a>
          )}

          <div className="mt-6 flex flex-col items-center">
            <div className="relative">
              <QrFrame>
                {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from the gateway */}
                <img
                  src={props.qr}
                  alt={t("qrAlt")}
                  width={232}
                  height={232}
                  className={`size-[232px] transition-[filter,opacity] duration-500 ${
                    shown === "pending" ? "" : "opacity-25 blur-[3px]"
                  }`}
                />
              </QrFrame>
              {shown !== "pending" && <Overlay status={shown} />}
            </div>
            <p className="text-bone/60 mt-5 text-sm">{t("scan")}</p>
          </div>

          <div className="mt-6">
            <p className="text-bone/55 text-center text-xs tracking-[0.18em] uppercase">
              {t("orCode")}
            </p>
            <CodeBox code={props.code} disabled={shown !== "pending"} />
          </div>

          {shown === "pending" ? (
            <>
              {props.appLink && (
                <a
                  href={props.appLink}
                  className="border-bone/20 text-bone hover:border-gold hover:text-gold-deep mt-6 hidden w-full items-center justify-center gap-3 rounded-full border px-6 py-3 text-sm font-semibold transition-colors lg:flex"
                >
                  <PhoneIcon />
                  {t("openApp")}
                </a>
              )}
              <form action={cancelPayment} className="mt-5 text-center">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="order" value={props.orderId} />
                <button
                  type="submit"
                  className="text-bone/50 hover:text-status-critical cursor-pointer text-sm underline-offset-4 transition-colors hover:underline"
                >
                  {t("cancel")}
                </button>
              </form>
            </>
          ) : shown !== "paid" ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {shown !== "cancelled" && (
                <form action={startCheckout} className="flex-1">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="plan" value={props.planId} />
                  <button
                    type="submit"
                    className="bg-gold text-ink hover:bg-gold-bright w-full cursor-pointer rounded-full px-6 py-3 text-sm font-semibold transition-colors"
                  >
                    {t("newCode")}
                  </button>
                </form>
              )}
              <Link
                href="/pro"
                className="border-bone/20 text-bone/75 hover:text-bone flex-1 rounded-full border px-6 py-3 text-center text-sm transition-colors"
              >
                {t("backToPlans")}
              </Link>
            </div>
          ) : null}
        </div>

        {/* ── Order summary and the steps ── */}
        <aside className="space-y-6 lg:order-1">
          <div className="tone-navy rounded-3xl bg-[var(--color-ink)] p-6 sm:p-8">
            <p className="text-bone/55 text-xs tracking-[0.25em] uppercase">{t("orderTitle")}</p>
            <p className="font-display text-bone mt-4 text-lg font-semibold">
              {t("product")} · {props.planName}
            </p>
            <p className="font-display text-bone mt-2 text-4xl font-bold">
              {props.amount}
              <span className="text-bone/50 ms-2 text-base font-normal">{props.period}</span>
            </p>
            <dl className="border-bone/12 mt-6 space-y-3 border-t pt-5 text-sm">
              <Row label={t("method")} value={t("methodFib")} />
              <Row label={t("reference")} value={<span dir="ltr" className="font-mono">{reference}</span>} />
              <Row label={t("total")} value={<span className="text-gold-deep font-semibold">{props.amount}</span>} />
            </dl>
          </div>

          <div className="border-bone/12 bg-surface rounded-3xl border p-6 sm:p-8">
            <h2 className="text-bone text-base font-semibold">{t("stepsTitle")}</h2>
            <ol className="mt-5 space-y-4">
              {(["step1", "step2", "step3", "step4"] as const).map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="border-gold/50 text-gold-deep flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-bone/75 text-sm leading-relaxed">{t(step)}</span>
                </li>
              ))}
            </ol>
            <p className="border-bone/10 text-bone/55 mt-6 flex gap-3 border-t pt-5 text-xs leading-relaxed">
              <svg viewBox="0 0 16 16" className="text-gold-deep mt-0.5 size-4 shrink-0" aria-hidden="true">
                <path d="M8 1.5 2.5 3.5v4c0 3.4 2.3 6 5.5 7 3.2-1 5.5-3.6 5.5-7v-4z" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <path d="m5.5 8 1.8 1.8L10.8 6.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              {t("closeNote")}
            </p>
          </div>
        </aside>
      </div>

      {props.simulateRef && shown === "pending" && (
        <Simulator providerRef={props.simulateRef} onSent={poll} />
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-bone/55">{label}</dt>
      <dd className="text-bone text-end">{value}</dd>
    </div>
  );
}

/** Status pill and the time left, with a bar that drains as the code ages. */
function StatusBar({
  status,
  remaining,
  windowMs,
}: {
  status: PaymentStatus;
  remaining: number | null;
  windowMs: number | null;
}) {
  const t = useTranslations("pro.pay");
  const fraction =
    remaining === null || !windowMs ? 1 : Math.min(1, Math.max(0, remaining / windowMs));
  const low = remaining !== null && remaining < 60_000;
  const tone =
    status === "pending"
      ? "text-gold-deep"
      : status === "paid"
        ? "text-status-clear"
        : "text-status-critical";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span role="status" aria-live="polite" className={`flex items-center gap-2.5 text-sm font-semibold ${tone}`}>
          <span className="relative flex size-2.5">
            {status === "pending" && (
              <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />
            )}
            <span className="relative size-2.5 rounded-full bg-current" />
          </span>
          {t(`state.${status}`)}
        </span>
        {status === "pending" && remaining !== null && (
          <span className="text-bone/55 text-sm">
            {t("expiresIn")}{" "}
            <span dir="ltr" className={`font-semibold tabular-nums ${low ? "text-status-critical" : "text-bone"}`}>
              {clock(remaining)}
            </span>
          </span>
        )}
      </div>
      <div className="bg-bone/8 mt-4 h-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            status === "paid" ? "bg-status-clear" : low ? "bg-status-critical" : "bg-gold"
          }`}
          style={{ width: `${(status === "paid" ? 1 : status === "pending" ? fraction : 0) * 100}%` }}
        />
      </div>
    </div>
  );
}

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** White tile with gold corner marks, so the QR reads as the thing to aim at. */
function QrFrame({ children }: { children: React.ReactNode }) {
  const corner = "border-gold absolute size-6";
  return (
    <div className="relative rounded-2xl bg-white p-4">
      <span className={`${corner} start-0 top-0 rounded-ss-2xl border-s-2 border-t-2`} />
      <span className={`${corner} end-0 top-0 rounded-se-2xl border-e-2 border-t-2`} />
      <span className={`${corner} start-0 bottom-0 rounded-es-2xl border-s-2 border-b-2`} />
      <span className={`${corner} end-0 bottom-0 rounded-ee-2xl border-e-2 border-b-2`} />
      {children}
    </div>
  );
}

/** Covers the QR once it can no longer be paid — or once it has been. */
function Overlay({ status }: { status: PaymentStatus }) {
  const t = useTranslations("pro.pay");
  const paid = status === "paid";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <span
        className={`flex size-14 items-center justify-center rounded-full text-white shadow-lg motion-safe:animate-[pay-pop_400ms_ease-out] ${
          paid ? "bg-status-clear" : "bg-status-critical"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
          {paid ? (
            <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          ) : status === "expired" ? (
            <>
              <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4.5l3 1.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          )}
        </svg>
      </span>
      <p className="text-bone mt-4 text-base font-semibold">{t(`overlay.${status}.title`)}</p>
      <p className="text-bone/65 mt-1 max-w-[16rem] text-sm leading-snug">
        {t(`overlay.${status}.body`)}
      </p>
    </div>
  );
}

/** The short code, large and left-to-right in every language, with copy. */
function CodeBox({ code, disabled }: { code: string; disabled: boolean }) {
  const t = useTranslations("pro.pay");
  const [copied, setCopied] = useState(false);
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reset.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.replace(/-/g, ""));
      setCopied(true);
      clearTimeout(reset.current);
      reset.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (an insecure origin, say): the code is still on screen.
    }
  };

  return (
    <div
      className={`border-bone/15 bg-surface mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed py-2 ps-5 pe-2 ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <span dir="ltr" className="text-bone font-mono text-xl font-bold tracking-[0.18em] sm:text-2xl">
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        disabled={disabled}
        className="border-bone/15 text-bone/75 hover:border-gold hover:text-gold-deep flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          {copied ? (
            <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          ) : (
            <>
              <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </>
          )}
        </svg>
        <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
      </button>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <rect x="4" y="1.5" width="8" height="13" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 12h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Development only: posts the callback FIB would send, through the real
 * callback endpoint, as though the customer had paid (or been declined).
 */
function Simulator({ providerRef, onSent }: { providerRef: string; onSent: () => void }) {
  const t = useTranslations("pro.pay");
  const [busy, setBusy] = useState(false);
  const send = async (status: "PAID" | "DECLINED") => {
    setBusy(true);
    await fetch("/api/payments/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: providerRef, status }),
    }).catch(() => {});
    onSent();
    setBusy(false);
  };
  return (
    <div className="border-status-elevated/60 bg-status-elevated/8 mt-8 rounded-2xl border border-dashed p-5">
      <p className="text-bone text-sm font-semibold">{t("sim.title")}</p>
      <p className="text-bone/60 mt-1 text-sm">{t("sim.body")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => send("PAID")}
          className="bg-status-clear cursor-pointer rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("sim.paid")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => send("DECLINED")}
          className="border-status-critical/50 text-status-critical cursor-pointer rounded-full border px-5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("sim.declined")}
        </button>
      </div>
    </div>
  );
}
