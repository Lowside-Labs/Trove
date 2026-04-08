import * as React from "react";
import IconChevronDownMedium from "central-icons/IconChevronDownMedium";
import IconSparkle2 from "central-icons-filled/IconSparkle2";
import IconSquareBehindSquare6 from "central-icons/IconSquareBehindSquare6";
import IconFinder from "central-icons/IconFinder";
import type { SourceStatus } from "trove-contracts";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/theme-toggle";
import { Menu } from "../../components/ui/menu";
import { cn } from "../../lib/cn";
import { SourceSyncPopover } from "../sync/source-sync-popover";
import { useSyncDialog } from "../sync/sync-dialog-context";
import { getSourceConfig } from "./source-registry";
import { SourceSyncButton } from "./source-sync-button";
import { getSourceSyncState, type SourceSyncState } from "./use-source-sync";

interface LibrarySidebarProps {
  workspaceRoot: string;
  selectedSource: string;
  sources: SourceStatus[];
  syncStateBySource: Record<string, SourceSyncState>;
  onSelectSource(sourceId: string): void;
}

const sourceScrollerMask = {
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
};

export function LibrarySidebar({
  onSelectSource,
  selectedSource,
  sources,
  syncStateBySource,
  workspaceRoot,
}: LibrarySidebarProps) {
  const { actions } = useSyncDialog();

  return (
    <aside className="flex h-full min-h-0 flex-col gap-10 pl-8 pb-8 pt-8">
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
                canSync
                syncState={getSourceSyncState(syncStateBySource, source.id)}
                onClick={() => onSelectSource(source.id)}
                onSync={() => actions.open(source.id)}
              />
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 -ml-2">
        <ThemeToggle />
        <ArchiveActionMenu workspaceRoot={workspaceRoot} />
      </div>
    </aside>
  );
}

function ArchiveActionMenu({ workspaceRoot }: { workspaceRoot: string }) {
  const [status, setStatus] = React.useState<"idle" | "copied" | "revealed" | "failed">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const resetTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const scheduleReset = (delay = 1600) => {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setStatus("idle");
      setErrorMessage(null);
      resetTimeoutRef.current = null;
    }, delay);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(workspaceRoot);
      setStatus("copied");
      setErrorMessage(null);
      scheduleReset();
    } catch (error) {
      console.error("ArchiveActionMenu: copy failed", error);
      setStatus("failed");
      setErrorMessage(error instanceof Error ? error.message : String(error));
      scheduleReset(2200);
    }
  };

  const handleReveal = async () => {
    try {
      await window.troveDesktop.system.revealArchivePath();
      setStatus("revealed");
      setErrorMessage(null);
      scheduleReset();
    } catch (error) {
      console.error("ArchiveActionMenu: reveal failed", error);
      setStatus("failed");
      setErrorMessage(error instanceof Error ? error.message : String(error));
      scheduleReset(2200);
    }
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="justify-start px-3 text-muted-foreground hover:text-foreground"
          >
            <IconSparkle2 className="size-4" />
            <span>
              {status === "copied"
                ? "Copied archive path"
                : status === "revealed"
                  ? "Revealed in Finder"
                  : status === "failed"
                    ? `Archive failed${errorMessage ? `: ${errorMessage}` : ""}`
                    : "Use with AI"}
            </span>
            <IconChevronDownMedium className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <Menu.Content side="top" align="start">
        <Menu.Item onClick={handleCopy}>
        <IconSquareBehindSquare6 className="size-5" />
          <span>Copy archive path</span>
        </Menu.Item>
        <Menu.Item onClick={handleReveal}>
        <IconFinder className="size-5" />
          <span>Reveal in Finder</span>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
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
  const { state } = useSyncDialog();
  const syncButtonRef = React.useRef<HTMLButtonElement>(null);
  const isSyncPopoverOpen = state.isOpen && state.sourceId === sourceId;
  const displayLabel = sourceId === "x" ? "X.com" : label;

  return (
    <div className="group flex items-baseline gap-2">
      <button
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-3 text-left",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        type="button"
        onClick={onClick}
      >
        <span
          className={cn(
            "text-[24px] leading-[1.05] font-medium",
            active ? "" : "opacity-75 group-hover:opacity-100",
          )}
        >
          {displayLabel}
        </span>
      </button>
      {sourceId && onSync && syncState ? (
        <>
          <SourceSyncButton
            ref={syncButtonRef}
            active={isSyncPopoverOpen}
            canSync={canSync}
            syncState={syncState}
            onClick={onSync}
          />
          <SourceSyncPopover anchorRef={syncButtonRef} sourceId={sourceId} />
        </>
      ) : null}
    </div>
  );
}
