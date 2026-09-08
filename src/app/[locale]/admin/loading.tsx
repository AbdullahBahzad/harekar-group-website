/**
 * Station skeleton.
 *
 * The console's pages are database-backed and none of them are instant, so
 * without this the rail sits alone on an empty column for as long as the query
 * takes and the click reads as having failed. Shapes rather than a spinner:
 * the layout the reader is about to get, held still.
 *
 * Note this covers the page only. The layout's own badge-count query runs
 * above this boundary, so a slow rail is not something a skeleton here can
 * hide.
 */
export default function AdminLoading() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="bg-bone/8 h-9 w-64" />
      <div className="bg-bone/5 mt-3 h-4 w-full max-w-xl" />

      <div className="border-bone/14 mt-6 border">
        {Array.from({ length: 6 }).map((_, row) => (
          <div
            key={row}
            className="border-bone/10 flex items-center gap-4 border-b px-4 py-4 last:border-b-0"
          >
            <div className="bg-bone/8 h-4 flex-1" />
            <div className="bg-bone/5 h-4 w-20" />
            <div className="bg-bone/5 h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
