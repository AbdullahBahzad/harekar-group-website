"use client";

import { useState } from "react";

/**
 * Copies a shareable URL — the current page's by default, since the point
 * of a shareable report link is that it works from wherever it is pasted,
 * so `location.href` is usually already the answer. The map's side panel
 * passes a specific marker's report URL instead, since the page it's on
 * (the map itself) isn't the thing being shared.
 */
export default function CopyLinkButton({
  label,
  copiedLabel,
  url,
}: {
  label: string;
  copiedLabel: string;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url ?? window.location.href);
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
