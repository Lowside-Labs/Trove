import IconCheckmark1 from "central-icons-bold/IconCheckmark1";
import { motion } from "motion/react";
import type { SourceStatus } from "trove-contracts";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/cn";
import type { OnboardingSourceSyncStatus } from "./onboarding-types";
import { getSourceConfig, SourceIcon } from "../library/source-registry";

const SOURCE_DISPLAY_ORDER = ["x", "instagram", "github", "chatgpt", "claude", "substack", "hn"];

export function sortOnboardingSources(sources: SourceStatus[]): SourceStatus[] {
  return [...sources].sort((a, b) => {
    const leftIndex = SOURCE_DISPLAY_ORDER.indexOf(a.id);
    const rightIndex = SOURCE_DISPLAY_ORDER.indexOf(b.id);
    return (leftIndex === -1 ? Infinity : leftIndex) - (rightIndex === -1 ? Infinity : rightIndex);
  });
}

function SourceGlyph({
  sourceId,
  className,
  tone,
}: {
  sourceId: string;
  className?: string;
  tone?: "auto" | "light" | "dark";
}) {
  return (
    <SourceIcon
      className={cn("size-10", className)}
      config={getSourceConfig(sourceId).icons}
      {...(tone ? { tone } : {})}
    />
  );
}

function SourceSelectionBadge() {
  return (
    <span className="absolute -right-2 -bottom-2 flex size-7 items-center justify-center rounded-full bg-foreground shadow-sm">
      <IconCheckmark1 className="size-4 text-background" />
    </span>
  );
}

export function OnboardingSourceSelectionTile({
  isSelected,
  onSelect,
  source,
}: {
  isSelected: boolean;
  onSelect(): void;
  source: SourceStatus;
}) {
  return (
    <button
      className="flex cursor-pointer flex-col items-center gap-3 select-none"
      type="button"
      onClick={onSelect}
    >
      <span className="relative">
        <div
          className={cn(
            "flex size-28 items-center justify-center rounded-3xl transition-all duration-50",
            isSelected
              ? "bg-white shadow-md dark:bg-white/10"
              : "bg-foreground/10 opacity-50 dark:bg-white/6",
          )}
        >
          <SourceGlyph
            className={cn(
              isSelected
                ? "text-foreground [filter:grayscale(1)_brightness(0)] dark:text-white dark:[filter:grayscale(1)_brightness(0)_invert(1)]"
                : "text-[#8f8f97] [filter:grayscale(1)_brightness(0.62)] dark:text-[#8f8f97] dark:[filter:grayscale(1)_brightness(0)_invert(1)] dark:opacity-55",
            )}
            sourceId={source.id}
          />
        </div>
        {isSelected ? <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 40, velocity: 5 }}
        >
          <SourceSelectionBadge />
        </motion.div> : null}
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          isSelected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {source.displayName}
      </span>
    </button>
  );
}

export function OnboardingSelectedSourcesInline({
  sourceIds,
}: {
  sourceIds: string[];
}) {
  return (
    <span className="inline-flex items-center">
      {sourceIds.map((sourceId) => (
        <span
          key={sourceId}
          className="relative -ml-1 inline-flex size-6 items-center justify-center rounded-full bg-[#57575c] text-white ring-2 ring-[oklch(0.205_0_0)] first:ml-0 dark:bg-[#6d6d72] dark:ring-[#242424]"
        >
          <SourceGlyph
            className="size-3.5 text-white [filter:grayscale(1)_brightness(0)_invert(1)]"
            sourceId={sourceId}
            tone="dark"
          />
        </span>
      ))}
    </span>
  );
}

export function OnboardingSourceUsernameInput({
  onChange,
  value,
}: {
  onChange(value: string): void;
  value: string;
}) {
  return (
    <Input
      className="h-11 rounded-xl border-0 bg-foreground/[0.04] text-sm shadow-none focus:bg-background"
      placeholder="Your Hacker News username"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function OnboardingSyncSourceTile({
  isActive,
  sourceId,
  status,
}: {
  isActive: boolean;
  sourceId: string;
  status: OnboardingSourceSyncStatus;
}) {
  return (
    <div
      className={cn(
        "relative flex size-[4.5rem] items-center justify-center rounded-[1.35rem]",
        status === "failed" && "bg-red-500/10 text-red-600 dark:text-red-300",
        status === "succeeded" && "bg-background/80 shadow-sm dark:bg-white/8",
        isActive && "bg-background shadow-lg dark:bg-white/12",
        status === "pending" && "bg-foreground/[0.04] text-foreground/35",
      )}
    >
      <SourceGlyph
        className={cn(
          "size-8",
          status === "pending" && "opacity-50",
          status === "succeeded" && "opacity-80",
          status === "failed" && "opacity-70",
        )}
        sourceId={sourceId}
      />
      {status === "succeeded" ? (
        <span className="absolute -right-2 -bottom-2 flex size-6 items-center justify-center rounded-full bg-foreground shadow-sm">
          <IconCheckmark1 className="size-3.5 text-background" />
        </span>
      ) : null}
    </div>
  );
}
