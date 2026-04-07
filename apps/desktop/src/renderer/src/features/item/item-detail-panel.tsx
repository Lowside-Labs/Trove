import type { LibraryItemDetail, LibraryItemSummary } from "trove-contracts";
import { Button } from "../../components/ui/button";
import { formatDateTime } from "../../lib/format";

interface ItemDetailPanelProps {
  item: LibraryItemDetail | null;
  summary: LibraryItemSummary | null;
  error: string | null;
  isLoading: boolean;
  onOpenSource(): void;
}

export function ItemDetailPanel({
  error,
  isLoading,
  item,
  onOpenSource,
  summary,
}: ItemDetailPanelProps) {
  const activeItem = item ?? summary;

  if (!activeItem) {
    return (
      <aside className="trove-panel flex min-h-[24rem] items-center justify-center rounded-[2rem] p-8">
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-xs font-semibold tracking-wide text-zinc-500">
            Reader
          </p>
          <h2 className="font-serif text-4xl leading-none text-zinc-950">
            Select a piece from the gallery.
          </h2>
          <p className="text-sm leading-7 text-zinc-600">
            The right pane becomes the immersive reader for whatever you open.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="trove-panel flex min-h-[24rem] flex-col rounded-[2rem] p-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-10rem)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-zinc-500">
            {activeItem.source}
          </p>
          <h2 className="font-serif text-4xl leading-[0.95] text-zinc-950">
            {activeItem.title}
          </h2>
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenSource}>
          Open
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-600">
        <MetaPill label={`Saved ${formatDateTime(activeItem.savedAt)}`} />
        <MetaPill label={`Imported ${formatDateTime(activeItem.importedAt)}`} />
        {activeItem.author ? <MetaPill label={activeItem.author} /> : null}
        <MetaPill label={activeItem.kind} />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
        {error ? (
          <p className="text-sm leading-7 text-red-700">{error}</p>
        ) : isLoading && !item ? (
          <p className="text-sm leading-7 text-zinc-500">Loading archived content…</p>
        ) : (
          <div className="space-y-6">
            {activeItem.excerpt ? (
              <p className="text-base leading-8 text-zinc-700">{activeItem.excerpt}</p>
            ) : null}

            <article className="space-y-4">
              {item?.content ? (
                <p className="whitespace-pre-wrap text-[15px] leading-8 text-zinc-800">
                  {item.content}
                </p>
              ) : (
                <p className="text-sm leading-7 text-zinc-500">
                  No archived reader content is stored for this item yet. You can still open the
                  original source.
                </p>
              )}
            </article>

            {activeItem.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeItem.tags.map((tag) => (
                  <MetaPill key={tag} label={tag} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

function MetaPill({ label }: { label: string }) {
  return <span className="rounded-full bg-black/4 px-3 py-1.5 ring-1 ring-black/6">{label}</span>;
}
