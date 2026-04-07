import IconCheckCircle2 from "central-icons-filled/IconCheckCircle2";
import IconLoader from "central-icons/IconLoader";
import IconCloudSimpleDownload from "central-icons-filled/IconCloudSimpleDownload";
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

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = syncState.status;

    if (syncState.status === "idle" && previousStatus !== "idle") {
      setKeepVisibleDuringIdleTransition(true);

      const timeoutId = window.setTimeout(() => {
        setKeepVisibleDuringIdleTransition(false);
      }, 220);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setKeepVisibleDuringIdleTransition(false);
  }, [syncState.status]);

  const Icon =
    syncState.status === "syncing"
      ? IconLoader
      : syncState.status === "succeeded"
        ? IconCheckCircle2
        : IconCloudSimpleDownload;
  const iconKey =
    syncState.status === "syncing"
      ? "syncing"
      : syncState.status === "succeeded"
        ? "succeeded"
        : syncState.status === "failed"
          ? "failed"
          : "idle";
  const shouldForceVisible =
    syncState.status === "syncing" ||
    syncState.status === "succeeded" ||
    syncState.status === "failed" ||
    active ||
    keepVisibleDuringIdleTransition;

  return (
    <button
      ref={ref}
      className={cn(
        "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        shouldForceVisible && "opacity-100",
        syncState.status === "succeeded" && "text-foreground",
        syncState.status === "failed" && "text-destructive",
      )}
      disabled={syncState.status === "syncing"}
      title={syncState.error ?? syncState.latestMessage ?? "Sync source"}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={iconKey}
          initial={{ opacity: 0, filter: "blur(4px)", scale: 0.8 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(4px)", scale: 0.8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <Icon
            className={cn(
              "size-6",
              syncState.status === "syncing" && "animate-sync-spinner",
            )}
          />
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">Sync source</span>
    </button>
  );
});
