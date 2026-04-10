import type { SourceStatus } from "trove-contracts";
import { Button } from "../../components/ui/button";
import { useSyncDialog } from "../sync/sync-dialog-context";
import { getSourceConfig } from "./source-registry";

interface LibraryEmptyStateProps {
  selectedSource: string;
  sources: SourceStatus[];
  searchQuery: string;
  onClearSearch(): void;
}

export function LibraryEmptyState({
  selectedSource,
  searchQuery,
  onClearSearch,
}: LibraryEmptyStateProps) {
  if (searchQuery) {
    return <NoResultsEmpty query={searchQuery} onClear={onClearSearch} />;
  }

  return <SourceEmpty selectedSource={selectedSource} />;
}

// ---------------------------------------------------------------------------
// No search results
// ---------------------------------------------------------------------------

function NoResultsEmpty({ query, onClear }: { query: string; onClear(): void }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-[36ch] flex-col items-center gap-4 text-center">
        <h2 className="text-sm font-medium text-foreground text-balance">
          No results for &ldquo;{query}&rdquo;
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Try a different search term or check the spelling.
        </p>
        <Button variant="primary" size="sm" shape="pill" onClick={onClear}>
          Clear search
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// No items synced for source
// ---------------------------------------------------------------------------

function SourceEmpty({ selectedSource }: { selectedSource: string }) {
  const { actions } = useSyncDialog();
  const isAll = selectedSource === "all";
  const sourceName = isAll ? null : (getSourceConfig(selectedSource).displayName ?? selectedSource);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-[36ch] flex-col items-center gap-4 text-center">
        <h2 className="text-sm font-medium text-foreground text-balance">
          {isAll ? "Nothing here yet" : `No ${sourceName} items yet`}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          {isAll
            ? "Sync from a source in the sidebar to start building your archive."
            : `Sync your ${sourceName} content to start browsing it here.`}
        </p>
        {!isAll ? (
          <Button
            variant="primary"
            size="sm"
            shape="pill"
            onClick={() => actions.open(selectedSource)}
          >
            Sync {sourceName}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
