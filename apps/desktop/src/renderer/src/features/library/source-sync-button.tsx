import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import type { SourceSyncState } from "./use-source-sync";

interface SourceSyncButtonProps {
  active?: boolean;
  canSync: boolean;
  syncState: SourceSyncState;
  onClick(): void;
}

type VisualStatus = "idle" | "syncing" | "succeeded" | "failed";
const visualLabels: Record<VisualStatus, string> = {
  idle: "Sync",
  syncing: "Syncing",
  succeeded: "Done",
  failed: "Retry",
};

export const SourceSyncButton = forwardRef<HTMLButtonElement, SourceSyncButtonProps>(
function SourceSyncButton({
  active = false,
  canSync,
  onClick,
  syncState,
}, ref) {
  if (!canSync) {
    return null;
  }

  const [keepVisibleDuringIdleTransition, setKeepVisibleDuringIdleTransition] = useState(false);
  const previousStatusRef = useRef(syncState.status);
  const exitingStatusRef = useRef<VisualStatus>("idle");

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = syncState.status;

    if (syncState.status === "idle" && previousStatus !== "idle") {
      exitingStatusRef.current = toVisualStatus(previousStatus);
      setKeepVisibleDuringIdleTransition(true);

      const timeoutId = window.setTimeout(() => {
        setKeepVisibleDuringIdleTransition(false);
      }, 260);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setKeepVisibleDuringIdleTransition(false);
  }, [syncState.status]);

  const visualStatus =
    syncState.status === "idle" && keepVisibleDuringIdleTransition
      ? exitingStatusRef.current
      : toVisualStatus(syncState.status);
  const shouldForceVisible =
    visualStatus === "syncing" ||
    visualStatus === "succeeded" ||
    visualStatus === "failed" ||
    active ||
    keepVisibleDuringIdleTransition;

  const label = visualLabels[visualStatus];

  return (
    <motion.button
      ref={ref}
      layout="position"
      className={cn(
        "relative flex h-8 shrink-0 cursor-pointer items-center overflow-hidden rounded-full px-3 text-base font-medium text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        "transition-none",
        shouldForceVisible && "opacity-100",
        visualStatus === "succeeded" && "text-foreground",
        visualStatus === "failed" && "text-destructive",
      )}
      disabled={visualStatus === "syncing"}
      title={syncState.error ?? syncState.latestMessage ?? "Sync source"}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span className="relative grid place-items-center">
        <span className="invisible block whitespace-nowrap">
          {visualLabels.syncing}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={visualStatus}
            layout="position"
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap will-change-transform"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{
              y: {
                type: "spring",
                stiffness: 540,
                damping: 36,
              },
            }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="sr-only">Sync source</span>
    </motion.button>
  );
});

function toVisualStatus(status: SourceSyncState["status"]): VisualStatus {
  switch (status) {
    case "syncing":
    case "succeeded":
    case "failed":
      return status;
    case "idle":
    default:
      return "idle";
  }
}
