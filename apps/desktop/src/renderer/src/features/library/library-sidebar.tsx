import type { SourceStatus } from "trove-contracts";
import { ThemeToggle } from "../../components/theme-toggle";
import { cn } from "../../lib/cn";
import { getSourceConfig, SourceIcon } from "./source-registry";
import { SourceSyncButton } from "./source-sync-button";
import { getSourceSyncState, type SourceSyncState } from "./use-source-sync";

interface LibrarySidebarProps {
  selectedSource: string;
  sources: SourceStatus[];
  syncStateBySource: Record<string, SourceSyncState>;
  onSelectSource(sourceId: string): void;
  onSyncSource(sourceId: string): void;
}

const sourceScrollerMask = {
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
};

export function LibrarySidebar({
  onSyncSource,
  onSelectSource,
  selectedSource,
  sources,
  syncStateBySource,
}: LibrarySidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-10 px-8 pb-8 pt-8">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto py-1" style={sourceScrollerMask}>
          <nav className="flex flex-col">
            <SourceItem
              active={selectedSource === "all"}
              label="All"
              onClick={() => onSelectSource("all")}
            />
            {sources.map((source) => (
              <SourceItem
                key={source.id}
                active={selectedSource === source.id}
                label={source.displayName}
                sourceId={source.id}
                canSync={!source.requiresUser}
                syncState={getSourceSyncState(syncStateBySource, source.id)}
                onClick={() => onSelectSource(source.id)}
                onSync={() => onSyncSource(source.id)}
              />
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-auto">
        <ThemeToggle />
      </div>
    </aside>
  );
}

interface SourceItemProps {
  active: boolean;
  canSync?: boolean;
  label: string;
  sourceId?: string;
  onClick(): void;
  onSync?(): void;
  syncState?: SourceSyncState;
}

function SourceItem({
  active,
  canSync = false,
  label,
  onClick,
  onSync,
  sourceId,
  syncState,
}: SourceItemProps) {
  const source = sourceId ? getSourceConfig(sourceId) : null;
  const useBrandIcon = sourceId === "x" && source?.isKnown;

  return (
    <div className="group flex items-center gap-2">
      <button
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-3 text-left",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        type="button"
        onClick={onClick}
      >
        {useBrandIcon ? (
          <span
            className={cn(
              "flex h-[25px] items-center",
              active ? "" : "opacity-75 group-hover:opacity-100",
            )}
          >
            <SourceIcon config={source.icons} className="h-[20px] w-auto" />
            <span className="sr-only">{label}</span>
          </span>
        ) : (
          <span
            className={cn(
              "text-[24px] leading-[1.05] font-medium",
              active ? "" : "opacity-75 group-hover:opacity-100",
            )}
          >
            {label}
          </span>
        )}
      </button>
      {sourceId && onSync && syncState ? (
        <SourceSyncButton
          canSync={canSync}
          syncState={syncState}
          onClick={onSync}
        />
      ) : null}
    </div>
  );
}
