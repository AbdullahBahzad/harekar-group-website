"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Panel from "@/components/admin/Panel";
import type { MediaKind } from "@/data/media-slots";

export type ConsoleMediaItem = {
  slot: string;
  kind: MediaKind;
  maxBytes: number;
  /** The `accept` list for the file picker. */
  accept: string;
  /** What the site shows now — the upload, or the shipped original. */
  url: string;
  upload: { fileName: string; size: number; updatedAt: string } | null;
};

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

/**
 * One card per replaceable piece of media. The current file is shown full
 * width — for a video, playable — so an operator can see exactly what the
 * site shows before replacing it.
 *
 * Uploads use XMLHttpRequest rather than fetch for one reason: fetch cannot
 * report upload progress, and a homepage video is tens of megabytes — without
 * a progress bar, a slow connection looks exactly like a frozen page.
 */
export default function MediaConsole({
  items,
  readOnly,
}: {
  items: ConsoleMediaItem[];
  /** Preview mode (no database): uploads are disabled. */
  readOnly: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {items.map((item) => (
        <MediaCard key={item.slot} item={item} readOnly={readOnly} />
      ))}
    </div>
  );
}

function MediaCard({ item, readOnly }: { item: ConsoleMediaItem; readOnly: boolean }) {
  const t = useTranslations("admin.media");
  const locale = useLocale();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(item);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const errorText = (key: string) =>
    t.has(`errors.${key}`) ? t(`errors.${key}`, { max: megabytes(item.maxBytes) }) : t("errors.generic");

  function upload(file: File) {
    setError(null);
    setNotice(null);

    if (!item.accept.split(",").includes(file.type)) {
      setError(errorText("wrongType"));
      return;
    }
    if (file.size > item.maxBytes) {
      setError(errorText("tooLarge"));
      return;
    }

    const request = new XMLHttpRequest();
    request.open("POST", `/api/admin/media/${item.slot}`);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      setProgress(null);
      setBusy(false);
      let body: { error?: string; url?: string; fileName?: string; size?: number; updatedAt?: string } = {};
      try {
        body = JSON.parse(request.responseText);
      } catch {
        // nginx answers an oversized upload with an HTML page, not JSON.
      }
      if (request.status === 413) return setError(errorText("tooLarge"));
      if (request.status >= 400 || !body.url) return setError(errorText(body.error ?? "generic"));

      setCurrent({
        ...current,
        url: body.url,
        upload: { fileName: body.fileName ?? file.name, size: body.size ?? file.size, updatedAt: body.updatedAt ?? new Date().toISOString() },
      });
      setNotice(t("uploadedNotice"));
      router.refresh();
    };
    request.onerror = () => {
      setProgress(null);
      setBusy(false);
      setError(errorText("network"));
    };

    setBusy(true);
    setProgress(0);
    request.send(file);
  }

  async function restore() {
    if (!window.confirm(t("confirmRestore"))) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/media/${item.slot}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !body.url) {
        setError(errorText(body.error ?? "generic"));
        return;
      }
      setCurrent({ ...current, url: body.url, upload: null });
      setNotice(t("restoredNotice"));
      router.refresh();
    } catch {
      setError(errorText("network"));
    } finally {
      setBusy(false);
    }
  }

  const updated = current.upload
    ? new Date(current.upload.updatedAt).toLocaleString(locale === "en" ? "en-GB" : locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <Panel label={t(`slots.${item.slot}.title`)}>
      <div className="space-y-4 p-5">
        <p className="text-bone/60 text-sm leading-relaxed">{t(`slots.${item.slot}.hint`)}</p>

        <div className="border-bone/14 bg-ink relative aspect-video w-full overflow-hidden rounded-lg border">
          {item.kind === "video" ? (
            <video
              key={current.url}
              src={current.url}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
              controls
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a live preview of whatever was just uploaded; optimisation would only delay it
            <img key={current.url} src={current.url} alt="" className="h-full w-full object-cover" />
          )}
          <span className="bg-ink/75 text-bone/80 absolute start-0 bottom-0 px-2 py-1 text-xs backdrop-blur">
            {current.upload ? t("uploaded") : t("original")}
          </span>
        </div>

        <p className="text-bone/60 text-xs">
          {current.upload
            ? t("currentUpload", {
                name: current.upload.fileName,
                size: megabytes(current.upload.size),
                date: updated ?? "",
              })
            : t("currentOriginal")}
        </p>

        {progress !== null && (
          <div>
            <div className="bg-bone/10 h-1.5 w-full overflow-hidden rounded-full" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="bg-gold h-full transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-bone/60 mt-1.5 text-xs">
              {progress < 100 ? t("uploading", { percent: progress }) : t("checking")}
            </p>
          </div>
        )}

        {error && <p className="text-status-critical text-sm">{error}</p>}
        {notice && <p className="text-status-clear text-sm">{notice}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept={item.accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) upload(file);
            }}
          />
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={() => input.current?.click()}
            className="border-gold/50 text-gold hover:bg-gold hover:text-ink flex min-h-11 cursor-pointer items-center border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("upload")}
          </button>
          {current.upload && (
            <button
              type="button"
              disabled={busy || readOnly}
              onClick={restore}
              className="text-bone/60 hover:text-bone flex min-h-11 cursor-pointer items-center px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("restore")}
            </button>
          )}
          <span className="text-bone/45 text-xs">
            {t(item.kind === "video" ? "requirementsVideo" : "requirementsImage", { max: megabytes(item.maxBytes) })}
          </span>
        </div>
      </div>
    </Panel>
  );
}
