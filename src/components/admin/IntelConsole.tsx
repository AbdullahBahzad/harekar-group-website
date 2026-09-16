"use client";

import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDate } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import { IRAQ_BOUNDS } from "@/data/iraq";
import Panel from "@/components/admin/Panel";
import type { LeafletPin } from "@/components/IraqLeafletMap";

// See the matching comment in `IraqMap.tsx` — Leaflet cannot be evaluated
// during server render.
const IraqLeafletMap = dynamic(() => import("@/components/IraqLeafletMap"), {
  ssr: false,
});
import {
  createMarker,
  deleteMarker,
  moveMarker,
  seedFromStaticMarkers,
  toggleMarkerPublished,
  toggleMarkerResolved,
  updateMarker,
} from "@/app/[locale]/admin/intelligence/actions";

export type ConsoleMarker = {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  severity: "CLEAR" | "ELEVATED" | "CRITICAL";
  access: "OPEN" | "LOCKED";
  headline: string | null;
  body: string | null;
  published: boolean;
  /** Closed out — see the schema comment on `IntelMarker.resolved`. */
  resolved: boolean;
  /** The value this row was read at — carried back on save; see `updateMarker`. */
  revision: number;
  updatedAt: string;
  updatedByName: string | null;
  /**
   * The analyst's underlying record, distinct from `headline`/`body` — see
   * the schema comment on `IntelMarker`. None of this reaches the public map.
   */
  category: string | null;
  incidentType: string | null;
  keyPoints: string | null;
  occurredAt: string | null;
  method: string | null;
  actor: string | null;
  actorDetail: string | null;
  target: string | null;
  targetDetail: string | null;
  sourceReliability: string | null;
  infoCredibility: string | null;
  facility: string | null;
  streetAddress: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourcePublishedAt: string | null;
  sourceText: string | null;
};

const severityTone = {
  CLEAR: "var(--color-status-clear)",
  ELEVATED: "var(--color-status-elevated)",
  CRITICAL: "var(--color-status-critical)",
} as const;

/** A draft marker exists only in the browser until it is saved. */
type Draft = { longitude: number; latitude: number };

/**
 * The intelligence station.
 *
 * The map is the control surface, not an illustration of one. Clicking empty
 * ground starts a marker there; dragging a pin moves it; selecting one opens
 * its assessment beside the map. Typing exact coordinates is the third way
 * in — for a location given as numbers (a report, a grid reference) rather
 * than a place to eyeball on screen — and it goes through the same `draft`
 * state a click does, so the two are never out of sync with each other.
 *
 * The same `IraqLeafletMap` the public map uses is used here, so a pin
 * placed in the console lands on precisely the same real-world spot out on
 * the site. There is no second copy of the country's geometry to drift.
 */
export default function IntelConsole({
  markers,
  canSeed,
}: {
  markers: ConsoleMarker[];
  canSeed: boolean;
}) {
  const t = useTranslations("admin");
  const reduceMotion = useReducedMotion();
  const [, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // The "enter coordinates" fallback to clicking the map — kept as raw
  // strings so a partial or momentarily invalid number (a bare "-", a typo)
  // doesn't fight the input while the operator is still typing it.
  const [coordLat, setCoordLat] = useState("");
  const [coordLng, setCoordLng] = useState("");
  const [coordError, setCoordError] = useState(false);

  function handleGoToCoordinates(event: React.FormEvent) {
    event.preventDefault();
    const latitude = Number(coordLat);
    const longitude = Number(coordLng);
    if (
      !coordLat.trim() ||
      !coordLng.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setCoordError(true);
      return;
    }
    setCoordError(false);
    setSelectedId(null);
    setDraft({
      latitude: Math.min(
        IRAQ_BOUNDS.maxLat,
        Math.max(IRAQ_BOUNDS.minLat, latitude),
      ),
      longitude: Math.min(
        IRAQ_BOUNDS.maxLon,
        Math.max(IRAQ_BOUNDS.minLon, longitude),
      ),
    });
    setCoordLat("");
    setCoordLng("");
  }

  /*
   * Optimistic positions so a dragged pin tracks the pointer immediately.
   * Waiting for the server round trip would make every drag feel broken on a
   * connection slower than localhost.
   */
  const [optimistic, applyOptimistic] = useOptimistic(
    markers,
    (state, moved: { id: string; longitude: number; latitude: number }) =>
      state.map((marker) =>
        marker.id === moved.id ? { ...marker, ...moved } : marker,
      ),
  );

  const selected = optimistic.find((marker) => marker.id === selectedId) ?? null;

  const handleMoveMarker = useCallback(
    (id: string, latitude: number, longitude: number) => {
      startTransition(async () => {
        applyOptimistic({ id, longitude, latitude });
        await moveMarker(id, longitude, latitude);
      });
    },
    [applyOptimistic],
  );

  const pins = useMemo<LeafletPin[]>(
    () =>
      optimistic.map((marker) => ({
        id: marker.id,
        lat: marker.latitude,
        lng: marker.longitude,
        tone: severityTone[marker.severity],
        dim: !marker.published || marker.resolved,
        // Repurposed here for "gated" rather than severity: the console has
        // its own dedicated colour-by-severity dot, so the ring is free to
        // flag the one other thing worth a glance on the map itself.
        ring: marker.access === "LOCKED",
        selected: marker.id === selectedId,
        label:
          marker.label +
          (!marker.published ? ` ·${t("intelligence.draftSuffix")}` : "") +
          (marker.resolved ? ` ·${t("intelligence.resolvedTag")}` : ""),
        draggable: true,
        onClick: () => {
          setDraft(null);
          setSelectedId(marker.id);
        },
        onDragEnd: (lat, lng) => handleMoveMarker(marker.id, lat, lng),
      })),
    [optimistic, selectedId, t, handleMoveMarker],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ---- the map -------------------------------------------------- */}
      <Panel
        label={t("intelligence.picture")}
        action={
          <span className="text-bone/56 text-xs">
            {t("intelligence.markerCount", { count: optimistic.length })}
          </span>
        }
      >
        <div className="p-3 sm:p-5">
          <div className="aspect-square w-full overflow-hidden rounded-xl">
            <IraqLeafletMap
              markers={pins}
              draftPoint={
                draft ? { lat: draft.latitude, lng: draft.longitude } : null
              }
              onMapClick={(lat, lng) => {
                setSelectedId(null);
                setDraft({ longitude: lng, latitude: lat });
              }}
              maskOutside
              ariaLabel={t("intelligence.mapLabel")}
            />
          </div>

          <p className="text-bone/56 mt-3 text-xs">
            {t("intelligence.mapHint")}
          </p>

          {/*
           * The typed-coordinate fallback to clicking the map — for a
           * location handed over as numbers rather than one worth eyeballing
           * on screen. Feeds the same `draft` state a click does, so the
           * pending pin appears on the map exactly as it would from a click,
           * ready to fill in and save below.
           */}
          <form
            onSubmit={handleGoToCoordinates}
            className="border-bone/12 mt-4 flex flex-wrap items-end gap-2 border-t pt-4"
          >
            <Field label={t("intelligence.latitude")}>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                dir="ltr"
                value={coordLat}
                onChange={(e) => {
                  setCoordLat(e.target.value);
                  setCoordError(false);
                }}
                placeholder="35.4700"
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-32 border px-3 py-2 text-sm outline-none transition-colors"
              />
            </Field>
            <Field label={t("intelligence.longitude")}>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                dir="ltr"
                value={coordLng}
                onChange={(e) => {
                  setCoordLng(e.target.value);
                  setCoordError(false);
                }}
                placeholder="44.3900"
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-32 border px-3 py-2 text-sm outline-none transition-colors"
              />
            </Field>
            <button
              type="submit"
              className="border-gold/50 text-gold hover:bg-gold hover:text-ink cursor-pointer border px-4 py-2 text-xs transition-colors"
            >
              {t("intelligence.goToCoordinates")}
            </button>
            {coordError && (
              <p className="text-status-critical w-full text-xs">
                {t("intelligence.coordinatesInvalid")}
              </p>
            )}
          </form>
        </div>
      </Panel>

      {/* ---- the editor ------------------------------------------------ */}
      <div className="flex flex-col gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected?.id ?? (draft ? "draft" : "empty")}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {selected ? (
              <MarkerEditor
                key={selected.id}
                marker={selected}
                onClose={() => setSelectedId(null)}
              />
            ) : draft ? (
              <MarkerEditor
                draft={draft}
                onDraftMove={(patch) =>
                  setDraft((current) => (current ? { ...current, ...patch } : current))
                }
                onClose={() => setDraft(null)}
              />
            ) : (
              <Panel label={t("intelligence.assessment")}>
                <div className="px-5 py-10 text-center">
                  <p className="text-bone/55 text-sm">
                    {t("intelligence.emptyEditor")}
                  </p>
                  {/*
                   * Only offered while the table is empty — see
                   * `seedFromStaticMarkers`, which is a no-op once any marker
                   * exists.
                   */}
                  {canSeed && (
                    <form action={seedFromStaticMarkers} className="mt-6">
                      <button
                        type="submit"
                        className="border-gold/50 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-5 py-2 text-xs transition-colors"
                      >
                        {t("intelligence.importOriginal")}
                      </button>
                    </form>
                  )}
                </div>
              </Panel>
            )}
          </motion.div>
        </AnimatePresence>

        <Panel label={t("common.register")}>
          <ul className="divide-bone/6 divide-y">
            {optimistic.length === 0 && (
              <li className="text-bone/50 px-4 py-6 text-sm">
                {t("intelligence.emptyRegister")}
              </li>
            )}
            {optimistic.map((marker) => (
              <li key={marker.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setSelectedId(marker.id);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-start transition-colors",
                    marker.id === selectedId
                      ? "bg-gold/8"
                      : "hover:bg-bone/[0.03]",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      background: marker.published
                        ? severityTone[marker.severity]
                        : "transparent",
                      boxShadow: `inset 0 0 0 1.5px ${severityTone[marker.severity]}`,
                    }}
                  />
                  <span className="text-bone/85 flex-1 truncate text-sm">
                    {marker.label}
                  </span>
                  {/* A coordinate pair reads lat-then-lon in every language. */}
                  <span dir="ltr" className="text-bone/56 text-xs tabular-nums">
                    {marker.latitude.toFixed(2)}, {marker.longitude.toFixed(2)}
                  </span>
                  {marker.access === "LOCKED" && (
                    <span className="text-gold/78 text-xs">
                      {t("intelligence.proTag")}
                    </span>
                  )}
                  {marker.resolved && (
                    <span className="text-bone/45 text-xs">
                      {t("intelligence.resolvedTag")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---- editor -------------------------------------------------------------- */

function MarkerEditor({
  marker,
  draft,
  onDraftMove,
  onClose,
}: {
  marker?: ConsoleMarker;
  draft?: Draft;
  /**
   * Only present for a new, unsaved marker — lets typing coordinates here
   * move the pending pin on the map live, the same way a click placed it.
   * An existing marker's position still changes on typing, it just takes
   * effect on Save like any other field, rather than live like a drag.
   */
  onDraftMove?: (patch: Partial<Draft>) => void;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const editing = Boolean(marker);
  const initialLongitude = marker?.longitude ?? draft?.longitude ?? 0;
  const initialLatitude = marker?.latitude ?? draft?.latitude ?? 0;
  /*
   * Local, editable, and text rather than number — typing a coordinate is a
   * third way to place a marker alongside clicking and dragging, so these
   * can no longer be the read-only hidden fields they were. Text avoids a
   * controlled `type="number"` input fighting the user over "-" or "35." on
   * the way to a real value, which `valueAsNumber` turns into `NaN` mid-edit.
   * `key={selected?.id ?? ...}` on this component in the parent remounts it
   * per target, so plain `useState` is enough here; there is no stale-prop
   * case to guard against.
   */
  const [latitudeText, setLatitudeText] = useState(String(initialLatitude));
  const [longitudeText, setLongitudeText] = useState(String(initialLongitude));
  // For display only (the coordinates line below) — a mid-edit, not-yet-
  // valid string falls back to the last known-good value rather than NaN.
  const latitude = Number(latitudeText) || initialLatitude;
  const longitude = Number(longitudeText) || initialLongitude;

  return (
    <Panel
      label={
        editing ? t("intelligence.assessment") : t("intelligence.newMarker")
      }
      tone={
        marker
          ? (marker.severity.toLowerCase() as "clear" | "elevated" | "critical")
          : "gold"
      }
      action={
        <button
          type="button"
          onClick={onClose}
          className="text-bone/50 hover:text-bone flex min-h-11 cursor-pointer items-center text-xs transition-colors"
        >
          {t("common.close")}
        </button>
      }
    >
      <form
        action={editing ? updateMarker : createMarker}
        className="space-y-4 p-5"
      >
        {marker && <input type="hidden" name="id" value={marker.id} />}
        {/*
         * The revision this form was opened at, not "current" — `updateMarker`
         * rejects the save if the row has moved on since, rather than one
         * operator's edit silently discarding another's. See the schema
         * comment on `IntelMarker.revision`.
         */}
        {marker && (
          <input type="hidden" name="revision" value={marker.revision} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("intelligence.latitude")}>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              dir="ltr"
              name="latitude"
              value={latitudeText}
              onChange={(e) => {
                setLatitudeText(e.target.value);
                const next = e.target.valueAsNumber;
                if (!Number.isNaN(next)) onDraftMove?.({ latitude: next });
              }}
              className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
            />
          </Field>
          <Field label={t("intelligence.longitude")}>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              dir="ltr"
              name="longitude"
              value={longitudeText}
              onChange={(e) => {
                setLongitudeText(e.target.value);
                const next = e.target.valueAsNumber;
                if (!Number.isNaN(next)) onDraftMove?.({ longitude: next });
              }}
              className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
            />
          </Field>
        </div>

        <Field label={t("intelligence.location")}>
          <input
            name="label"
            defaultValue={marker?.label ?? ""}
            required
            autoComplete="off"
            className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("intelligence.severity")}>
            <select
              name="severity"
              defaultValue={marker?.severity ?? "CLEAR"}
              className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
            >
              <option value="CLEAR">{t("severity.CLEAR")}</option>
              <option value="ELEVATED">{t("severity.ELEVATED")}</option>
              <option value="CRITICAL">{t("severity.CRITICAL")}</option>
            </select>
          </Field>

          <Field label={t("intelligence.access")}>
            <select
              name="access"
              defaultValue={marker?.access ?? "OPEN"}
              className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
            >
              <option value="OPEN">{t("intelligence.accessOpen")}</option>
              <option value="LOCKED">{t("intelligence.accessLocked")}</option>
            </select>
          </Field>
        </div>

        <Field label={t("intelligence.headline")}>
          <input
            name="headline"
            defaultValue={marker?.headline ?? ""}
            autoComplete="off"
            className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
          />
        </Field>

        <Field label={t("intelligence.assessment")}>
          <textarea
            name="body"
            defaultValue={marker?.body ?? ""}
            rows={6}
            className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm leading-relaxed outline-none transition-colors"
          />
        </Field>

        {/*
         * The analyst's underlying record. Collapsed by default — every field
         * here is optional and most markers will only ever need the headline
         * and assessment above; this is for the ones that need a paper trail.
         */}
        <details className="border-bone/12 border-t pt-4">
          <summary className="text-bone/55 hover:text-bone cursor-pointer text-xs select-none">
            {t("intelligence.incidentDetails")}
          </summary>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.category")}>
                <input
                  name="category"
                  defaultValue={marker?.category ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
              <Field label={t("intelligence.incidentType")}>
                <input
                  name="incidentType"
                  defaultValue={marker?.incidentType ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
            </div>

            <Field label={t("intelligence.occurredAt")}>
              <input
                type="datetime-local"
                name="occurredAt"
                defaultValue={toLocalInput(marker?.occurredAt ?? null)}
                dir="ltr"
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
              />
            </Field>

            <Field label={t("intelligence.keyPoints")} hint={t("intelligence.keyPointsHint")}>
              <textarea
                name="keyPoints"
                defaultValue={marker?.keyPoints ?? ""}
                rows={3}
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm leading-relaxed outline-none transition-colors"
              />
            </Field>

            <Field label={t("intelligence.method")}>
              <input
                name="method"
                defaultValue={marker?.method ?? ""}
                autoComplete="off"
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.actor")}>
                <input
                  name="actor"
                  defaultValue={marker?.actor ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
              <Field label={t("intelligence.actorDetail")}>
                <input
                  name="actorDetail"
                  defaultValue={marker?.actorDetail ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.target")}>
                <input
                  name="target"
                  defaultValue={marker?.target ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
              <Field label={t("intelligence.targetDetail")}>
                <input
                  name="targetDetail"
                  defaultValue={marker?.targetDetail ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.sourceReliability")}>
                <select
                  name="sourceReliability"
                  defaultValue={marker?.sourceReliability ?? ""}
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
                >
                  <option value="">{t("intelligence.notAssessed")}</option>
                  <option value="A">{t("intelligence.reliabilityA")}</option>
                  <option value="B">{t("intelligence.reliabilityB")}</option>
                  <option value="C">{t("intelligence.reliabilityC")}</option>
                  <option value="D">{t("intelligence.reliabilityD")}</option>
                  <option value="E">{t("intelligence.reliabilityE")}</option>
                  <option value="F">{t("intelligence.reliabilityF")}</option>
                </select>
              </Field>
              <Field label={t("intelligence.infoCredibility")}>
                <select
                  name="infoCredibility"
                  defaultValue={marker?.infoCredibility ?? ""}
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 text-xs outline-none"
                >
                  <option value="">{t("intelligence.notAssessed")}</option>
                  <option value="1">{t("intelligence.credibility1")}</option>
                  <option value="2">{t("intelligence.credibility2")}</option>
                  <option value="3">{t("intelligence.credibility3")}</option>
                  <option value="4">{t("intelligence.credibility4")}</option>
                  <option value="5">{t("intelligence.credibility5")}</option>
                  <option value="6">{t("intelligence.credibility6")}</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.facility")}>
                <input
                  name="facility"
                  defaultValue={marker?.facility ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
              <Field label={t("intelligence.city")}>
                <input
                  name="city"
                  defaultValue={marker?.city ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
            </div>

            <Field label={t("intelligence.streetAddress")}>
              <input
                name="streetAddress"
                defaultValue={marker?.streetAddress ?? ""}
                autoComplete="off"
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.district")}>
                <input
                  name="district"
                  defaultValue={marker?.district ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
              <Field label={t("intelligence.province")}>
                <input
                  name="province"
                  defaultValue={marker?.province ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("intelligence.sourceName")}>
                <input
                  name="sourceName"
                  defaultValue={marker?.sourceName ?? ""}
                  autoComplete="off"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
              <Field label={t("intelligence.sourcePublishedAt")}>
                <input
                  type="datetime-local"
                  name="sourcePublishedAt"
                  defaultValue={toLocalInput(marker?.sourcePublishedAt ?? null)}
                  dir="ltr"
                  className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
                />
              </Field>
            </div>

            <Field label={t("intelligence.sourceUrl")}>
              <input
                type="url"
                name="sourceUrl"
                defaultValue={marker?.sourceUrl ?? ""}
                dir="ltr"
                autoComplete="off"
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
              />
            </Field>

            <Field label={t("intelligence.sourceText")}>
              <textarea
                name="sourceText"
                defaultValue={marker?.sourceText ?? ""}
                rows={3}
                className="border-bone/16 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm leading-relaxed outline-none transition-colors"
              />
            </Field>
          </div>
        </details>

        <div className="flex flex-wrap gap-x-6 gap-y-2.5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="published"
              defaultChecked={marker?.published ?? false}
              className="accent-gold size-4 cursor-pointer"
            />
            <span className="text-bone/70 text-xs">
              {t("intelligence.publishToMap")}
            </span>
          </label>

          {/*
           * Independent of `published` — see the schema comment on
           * `IntelMarker.resolved`. A marker can be published and resolved
           * at once: it stays reachable at its report link, it just drops
           * off the active map.
           */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="resolved"
              defaultChecked={marker?.resolved ?? false}
              className="accent-gold size-4 cursor-pointer"
            />
            <span className="text-bone/70 text-xs">
              {t("intelligence.markResolved")}
            </span>
          </label>
        </div>

        <p className="text-bone/52 text-xs tabular-nums">
          {t("intelligence.coordinates", {
            lat: latitude.toFixed(4),
            lon: longitude.toFixed(4),
          })}
          {marker &&
            ` · ${t("intelligence.updatedAt", {
              date: formatDate(new Date(marker.updatedAt), locale, {
                dateStyle: "medium",
              }),
            })}`}
          {marker?.updatedByName &&
            ` ${t("intelligence.updatedBy", { who: marker.updatedByName })}`}
        </p>

        <div className="border-bone/12 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer px-5 py-2 text-xs transition-colors"
          >
            {editing ? t("common.save") : t("intelligence.placeMarker")}
          </button>

          {marker && (
            <>
              <button
                type="submit"
                formAction={toggleMarkerPublished}
                className="border-bone/26 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
              >
                {marker.published ? t("common.withdraw") : t("common.publish")}
              </button>

              <button
                type="submit"
                formAction={toggleMarkerResolved}
                className="border-bone/26 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 text-xs transition-colors"
              >
                {marker.resolved
                  ? t("intelligence.reopen")
                  : t("intelligence.resolve")}
              </button>

              {/*
               * Deletion is separated to the far end and tinted with the
               * critical colour, so it cannot be hit while reaching for Save.
               */}
              <button
                type="submit"
                formAction={deleteMarker}
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink ms-auto cursor-pointer border px-4 py-2 text-xs transition-colors"
              >
                {t("common.delete")}
              </button>
            </>
          )}
        </div>
      </form>
    </Panel>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-bone/55 mb-1.5 flex items-baseline gap-2 text-xs">
        {label}
        {hint && <span className="text-bone/35">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/**
 * An ISO timestamp as a `datetime-local` input value ("YYYY-MM-DDTHH:mm").
 *
 * The input reads and writes in the browser's local wall-clock time with no
 * timezone info either way, so this only has to line up years/months/etc —
 * not convert anything — with what `optionalDateTime` parses back out of it.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
