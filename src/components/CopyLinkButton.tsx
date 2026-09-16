"use client";

import { useState } from "react";

/**
 * Copies the current page's URL — the point of a shareable report link is
 * that it works from wherever it is pasted, so there is nothing for this to
 * compute; `location.href` already is the answer.
 */
export default function CopyLinkButton({
  label,
  copiedLabel,
}: {
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be denied (permissions, insecure context); the
      // label simply does not flip to "copied" and the user can select the
      // address bar themselves.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="border-bone/26 text-bone/70 hover:border-gold hover:text-gold flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm transition-colors"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
