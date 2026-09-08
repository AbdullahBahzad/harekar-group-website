"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { PublicFaqItem } from "@/lib/faq";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * The question named by the URL fragment, if any, matched against whichever
 * items are actually on the page. Read through `useSyncExternalStore` so the
 * server snapshot is empty and hydration matches, rather than reading
 * `location` during render.
 */
function useHashKey(itemIds: string[]): string | null {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );

  const id = hash.replace(/^#faq-/, "");
  return itemIds.includes(id) ? id : null;
}

export default function FaqAccordion({ items }: { items: PublicFaqItem[] }) {
  const t = useTranslations("faq");
  const reduceMotion = useReducedMotion();
  const itemIds = items.map((item) => item.id);

  /*
   * Multiple panels may be open at once. The old site closed the previous
   * answer whenever a new one opened, which makes two answers impossible to
   * compare and silently moves the page under the reader.
   *
   * `null` means "nobody has touched the accordion yet", in which case the URL
   * fragment decides what is open. Deriving it this way rather than seeding
   * state from an effect keeps the first paint correct and avoids a second
   * render pass.
   */
  const [override, setOverride] = useState<Set<string> | null>(null);
  const hashKey = useHashKey(itemIds);
  const open = override ?? new Set(hashKey ? [hashKey] : []);

  /*
   * Deep links land on a specific question — `/faq#faq-response` opens that
   * panel and scrolls to it, so the anchor can be shared or sent by support.
   * Only the scroll belongs in an effect; the open state is derived above.
   */
  useEffect(() => {
    if (!hashKey) return;
    document.getElementById(`faq-${hashKey}`)?.scrollIntoView({
      block: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [hashKey, reduceMotion]);

  const allOpen = open.size === items.length;

  function toggle(key: string) {
    setOverride(() => {
      const next = new Set(open);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOverride(allOpen ? new Set() : new Set(itemIds))}
          className="text-bone/58 hover:text-gold min-h-11 cursor-pointer text-xs tracking-[0.2em] uppercase transition-colors"
        >
          {allOpen ? t("collapseAll") : t("expandAll")}
        </button>
      </div>

      <ul className="border-bone/14 border-t">
        {items.map((item, i) => {
          const key = item.id;
          const isOpen = open.has(key);
          const panelId = `faq-panel-${key}`;
          const buttonId = `faq-button-${key}`;

          return (
            <li
              key={key}
              id={`faq-${key}`}
              className="border-bone/14 scroll-mt-24 border-b"
            >
              {/*
               * h2 wrapping the trigger: the button carries the interaction
               * while the heading keeps the question in the document outline,
               * so screen-reader users can jump between questions directly.
               * h2 rather than h3 because the page title is the only level
               * above it — skipping a level breaks the outline.
               */}
              <h2>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(key)}
                  className="group focus-visible:ring-gold/40 flex w-full cursor-pointer items-start gap-5 py-6 text-start outline-none focus-visible:ring-2"
                >
                  <span
                    className={`mt-1 w-7 shrink-0 text-xs tracking-[0.2em] tabular-nums transition-colors ${
                      isOpen ? "text-gold" : "text-gold/55 group-hover:text-gold/78"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span
                    className={`font-display flex-1 text-lg leading-snug font-medium transition-colors sm:text-xl ${
                      isOpen ? "text-bone" : "text-bone/80 group-hover:text-bone"
                    }`}
                  >
                    {item.question}
                  </span>

                  {/*
                   * Plus that rotates into a minus: one bar holds still, the
                   * other turns 90°, so the control animates between its two
                   * states instead of swapping glyphs.
                   */}
                  <span
                    aria-hidden
                    className={`relative mt-1.5 h-4 w-4 shrink-0 transition-colors ${
                      isOpen ? "text-gold" : "text-bone/50 group-hover:text-gold"
                    }`}
                  >
                    <span className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-current" />
                    <motion.span
                      className="absolute top-0 left-1/2 h-4 w-px -translate-x-1/2 bg-current"
                      animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
                      transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
                    />
                  </span>
                </button>
              </h2>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] },
                      // Exit reads faster than enter so dismissal feels immediate.
                      opacity: { duration: reduceMotion ? 0 : 0.2 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="pb-8 ps-12 pe-4">
                      <p className="text-bone/72 max-w-[65ch] text-sm leading-relaxed text-pretty">
                        {item.answer}
                      </p>

                      {item.list && <ServiceList list={item.list} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The bullet list behind a FAQ item that carries one (only "What services do
 * you offer?" does, today). Rendered as a real list across columns — as one
 * run-on paragraph of bullets it was the tallest thing on the page and
 * effectively unreadable.
 */
function ServiceList({ list }: { list: string[] }) {
  return (
    <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {list.map((item) => (
        <li key={item} className="text-bone/75 flex items-start gap-3 text-sm">
          <span
            aria-hidden
            className="bg-gold/70 mt-[0.55rem] h-1 w-1 shrink-0 rounded-full"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
