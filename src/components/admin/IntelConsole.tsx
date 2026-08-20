"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IRAQ_BOUNDS,
  MAP_HEIGHT,
  MAP_WIDTH,
  euphrates,
  iraqBorder,
  project,
  tigris,
  toPath,
} from "@/data/iraq";
import { cn } from "@/lib/utils";
import Panel from "@/components/admin/Panel";
import {
  createMarker,
  deleteMarker,
  moveMarker,
  seedFromStaticMarkers,
  toggleMarkerPublished,
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
  updatedAt: string;
  updatedByName: string | null;
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
 * its assessment beside the map. That directness is the point — an operator
 * editing a country's threat picture should be pointing at the country, not
 * typing latitudes into a table.
 *
 * The same `iraqBorder` and `project()` the public map uses are used here, so
 * a pin placed in the console lands on precisely the same pixel out on the
 * site. There is no second copy of the country's shape to drift.
 */
export default function IntelConsole({
  markers,
  canSeed,
}: {
  markers: ConsoleMarker[];
  canSeed: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

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

  /**
   * Turns a pointer position into lon/lat.
   *
   * Reads through the SVG's own viewBox rather than the element's pixel box,
   * because the map is fluid — a fixed pixel assumption would misplace every
   * marker at any width other than the one it was written against.
   */
  function pointerToCoordinates(event: React.PointerEvent): Draft | null {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;

    // The viewBox is inset by 20 units on each side; undo that before scaling.
    const x = xRatio * (MAP_WIDTH + 40) - 20;
    const y = yRatio * (MAP_HEIGHT + 40) - 20;

    const lonScale =
      (IRAQ_BOUNDS.maxLon - IRAQ_BOUNDS.minLon) / MAP_WIDTH;
    const latScale =
      (IRAQ_BOUNDS.maxLat - IRAQ_BOUNDS.minLat) / MAP_HEIGHT;

    return {
      longitude: IRAQ_BOUNDS.minLon + x * lonScale,
      latitude: IRAQ_BOUNDS.maxLat - y * latScale,
    };
  }

  function handleMapClick(event: React.PointerEvent) {
    if (dragging) return;
    const point = pointerToCoordinates(event);
    if (!point) return;
    setSelectedId(null);
    setDraft(point);
  }

  function handleDragEnd(event: React.PointerEvent, id: string) {
    const point = pointerToCoordinates(event);
    setDragging(null);
    if (!point) return;

    startTransition(async () => {
      applyOptimistic({ id, ...point });
      await moveMarker(id, point.longitude, point.latitude);
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ---- the map -------------------------------------------------- */}
      <Panel
        label="Operational picture"
        index="01"
        action={
          <span className="text-bone/30 font-mono text-[10px] tracking-[0.16em] uppercase">
            {optimistic.length} markers
          </span>
        }
      >
        <div className="p-3 sm:p-5">
          <svg
            ref={svgRef}
            viewBox={`-20 -20 ${MAP_WIDTH + 40} ${MAP_HEIGHT + 40}`}
            className={cn(
              "block h-auto w-full touch-none select-none",
              dragging ? "cursor-grabbing" : "cursor-crosshair",
            )}
            onPointerDown={handleMapClick}
            role="application"
            aria-label="Intelligence map. Click to place a marker."
          >
            <defs>
              {/* Cool plate, so gold pins read as the live layer above it. */}
              <linearGradient id="console-fill" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stopColor="rgba(197,156,64,0.16)" />
                <stop offset="100%" stopColor="rgba(197,156,64,0.05)" />
              </linearGradient>
            </defs>

            <path d={toPath(iraqBorder, true)} fill="url(#console-fill)" />
            <path
              d={toPath(iraqBorder, true)}
              fill="none"
              stroke="var(--color-gold)"
              strokeOpacity="0.55"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {[tigris, euphrates].map((river, index) => (
              <path
                key={index}
                d={toPath(river)}
                fill="none"
                stroke="var(--color-bone)"
                strokeOpacity="0.14"
                strokeWidth="1"
                strokeLinecap="round"
              />
            ))}

            {/* Draft pin — dashed, because it does not exist yet. */}
            {draft && (
              <g style={{ pointerEvents: "none" }}>
                <circle
                  cx={project([draft.longitude, draft.latitude]).x}
                  cy={project([draft.longitude, draft.latitude]).y}
                  r="9"
                  fill="none"
                  stroke="var(--color-gold-bright)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={project([draft.longitude, draft.latitude]).x}
                  cy={project([draft.longitude, draft.latitude]).y}
                  r="2.5"
                  fill="var(--color-gold-bright)"
                />
              </g>
            )}

            {optimistic.map((marker) => {
              const { x, y } = project([marker.longitude, marker.latitude]);
              const tone = severityTone[marker.severity];
              const isSelected = marker.id === selectedId;

              return (
                <g
                  key={marker.id}
                  className="cursor-grab"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setDraft(null);
                    setSelectedId(marker.id);
                    setDragging(marker.id);
                    (event.target as Element).setPointerCapture?.(
                      event.pointerId,
                    );
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    if (dragging === marker.id) handleDragEnd(event, marker.id);
                  }}
                >
                  {/* Selection ring, and the draft/unpublished cue. */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r="13"
                      fill="none"
                      stroke="var(--color-gold-bright)"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />
                  )}

                  <circle cx={x} cy={y} r="14" fill="transparent" />

                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill={marker.published ? tone : "var(--color-ink)"}
                    stroke={tone}
                    strokeWidth="1.6"
                  />

                  {marker.access === "LOCKED" && (
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill="none"
                      stroke={tone}
                      strokeOpacity="0.6"
                      strokeWidth="1"
                    />
                  )}

                  <text
                    x={x + 11}
                    y={y + 3.5}
                    fontSize="8.5"
                    fontWeight="500"
                    fill="var(--color-bone)"
                    fillOpacity={marker.published ? 0.85 : 0.4}
                    style={{ pointerEvents: "none" }}
                  >
                    {marker.label}
                    {!marker.published && " ·draft"}
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="text-bone/30 mt-3 font-mono text-[10px] tracking-[0.14em] uppercase">
            Click ground to place · drag a pin to move · select to edit
          </p>
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
                onClose={() => setDraft(null)}
              />
            ) : (
              <Panel label="Assessment" index="02">
                <div className="px-5 py-10 text-center">
                  <p className="text-bone/45 text-sm">
                    Select a marker to edit its assessment, or click anywhere on
                    the map to place a new one.
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
                        className="border-gold/40 text-gold hover:bg-gold hover:text-ink cursor-pointer rounded-full border px-5 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
                      >
                        Import original markers
                      </button>
                    </form>
                  )}
                </div>
              </Panel>
            )}
          </motion.div>
        </AnimatePresence>

        <Panel label="Register" index="03">
          <ul className="divide-bone/6 divide-y">
            {optimistic.length === 0 && (
              <li className="text-bone/40 px-4 py-6 text-sm">
                No markers yet.
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
                  <span className="text-bone/30 font-mono text-[10px] tabular-nums">
                    {marker.latitude.toFixed(2)}, {marker.longitude.toFixed(2)}
                  </span>
                  {marker.access === "LOCKED" && (
                    <span className="text-gold/70 font-mono text-[9px] tracking-[0.16em]">
                      PRO
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
  onClose,
}: {
  marker?: ConsoleMarker;
  draft?: Draft;
  onClose: () => void;
}) {
  const editing = Boolean(marker);
  const longitude = marker?.longitude ?? draft?.longitude ?? 0;
  const latitude = marker?.latitude ?? draft?.latitude ?? 0;

  return (
    <Panel
      label={editing ? "Assessment" : "New marker"}
      index="02"
      tone={
        marker
          ? (marker.severity.toLowerCase() as "clear" | "elevated" | "critical")
          : "gold"
      }
      action={
        <button
          type="button"
          onClick={onClose}
          className="text-bone/40 hover:text-bone cursor-pointer font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
        >
          Close
        </button>
      }
    >
      <form
        action={editing ? updateMarker : createMarker}
        className="space-y-4 p-5"
      >
        {marker && <input type="hidden" name="id" value={marker.id} />}
        <input type="hidden" name="longitude" value={longitude} />
        <input type="hidden" name="latitude" value={latitude} />

        <Field label="Location">
          <input
            name="label"
            defaultValue={marker?.label ?? ""}
            required
            autoComplete="off"
            className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Severity">
            <select
              name="severity"
              defaultValue={marker?.severity ?? "CLEAR"}
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 font-mono text-xs uppercase outline-none"
            >
              <option value="CLEAR">Clear</option>
              <option value="ELEVATED">Elevated</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </Field>

          <Field label="Access">
            <select
              name="access"
              defaultValue={marker?.access ?? "OPEN"}
              className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full cursor-pointer border px-3 py-2 font-mono text-xs uppercase outline-none"
            >
              <option value="OPEN">Open</option>
              <option value="LOCKED">Pro only</option>
            </select>
          </Field>
        </div>

        <Field label="Headline">
          <input
            name="headline"
            defaultValue={marker?.headline ?? ""}
            autoComplete="off"
            className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full border px-3 py-2 text-sm outline-none transition-colors"
          />
        </Field>

        <Field label="Assessment">
          <textarea
            name="body"
            defaultValue={marker?.body ?? ""}
            rows={6}
            className="border-bone/12 bg-ink/60 text-bone focus:border-gold w-full resize-y border px-3 py-2 text-sm leading-relaxed outline-none transition-colors"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="published"
            defaultChecked={marker?.published ?? false}
            className="accent-gold size-4 cursor-pointer"
          />
          <span className="text-bone/70 font-mono text-[10px] tracking-[0.18em] uppercase">
            Publish to the public map
          </span>
        </label>

        <p className="text-bone/25 font-mono text-[10px] tabular-nums">
          {latitude.toFixed(4)}°N · {longitude.toFixed(4)}°E
          {marker && ` · updated ${new Date(marker.updatedAt).toLocaleDateString()}`}
          {marker?.updatedByName && ` by ${marker.updatedByName}`}
        </p>

        <div className="border-bone/8 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="submit"
            className="bg-gold text-ink hover:bg-gold-bright cursor-pointer px-5 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
          >
            {editing ? "Save" : "Place marker"}
          </button>

          {marker && (
            <>
              <button
                type="submit"
                formAction={toggleMarkerPublished}
                className="border-bone/20 text-bone/70 hover:border-gold hover:text-gold cursor-pointer border px-4 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
              >
                {marker.published ? "Withdraw" : "Publish"}
              </button>

              {/*
               * Deletion is separated to the far end and tinted with the
               * critical colour, so it cannot be hit while reaching for Save.
               */}
              <button
                type="submit"
                formAction={deleteMarker}
                className="border-status-critical/40 text-status-critical hover:bg-status-critical hover:text-ink ms-auto cursor-pointer border px-4 py-2 font-mono text-[11px] tracking-[0.16em] uppercase transition-colors"
              >
                Delete
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-bone/45 mb-1.5 block font-mono text-[10px] tracking-[0.2em] uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
