import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Orb } from "../../../components/orb";
import { cn } from "../../../lib/cn";
import IconCheckmark1 from "central-icons-bold/IconCheckmark1";
import IconWorld from "central-icons/IconWorld";
import {
  getSourceConfig,
  SourceIcon,
} from "../../library/source-registry";
import { useOnboarding } from "../onboarding-context";
import { useOnboardingSync } from "../onboarding-sync-context";

function getRegistrySourceId(sourceId: string): string {
  if (sourceId === "hn") return "hackernews";
  return sourceId;
}

const SYNC_PHRASES = [
  "Raiding your bookmarks",
  "So many tabs, so little time",
  "You saved a lot of stuff",
  "Building your library",
  "Finding the good ones",
  "This is going to be fun",
  "Pulling threads together",
  "Dusting off old favorites",
  "Some real gems in here",
  "Almost home",
];

const enterTransition = { type: "spring" as const, stiffness: 300, damping: 28 };

const enterVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: enterTransition,
  },
};

const wordTransition = { type: "spring" as const, stiffness: 200, damping: 40 };

const wordVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: wordTransition,
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: "blur(6px)",
    transition: wordTransition,
  },
};

export function OnboardingSyncStep() {
  const { actions } = useOnboarding();
  const { actions: syncActions, meta, state } = useOnboardingSync();
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (state.status === "idle") {
      void syncActions.start();
    }
  }, [state.status, syncActions]);

  // Cycle through phrases
  useEffect(() => {
    if (state.status !== "syncing") return;
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % SYNC_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [state.status]);

  const currentPhrase = SYNC_PHRASES[phraseIndex] ?? SYNC_PHRASES[0]!;
  const words = currentPhrase!.split(" ");

  const activeSyncIndex = state.sourceStates.findIndex(
    (s) => s.status === "syncing",
  );

  const primaryAction =
    state.status === "syncing"
      ? { disabled: true, label: "Syncing…", onClick: () => undefined }
      : !meta.hasSucceeded && meta.hasFailures
        ? { disabled: false, label: "Back to Sources", onClick: actions.goBack }
        : { disabled: false, label: "Open Library", onClick: actions.complete };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.97 0.005 270) 0%, oklch(0.985 0.002 280) 40%, oklch(1 0 0) 100%)",
      }}
    >
      {/* macOS draggable region */}
      <div
        className="absolute top-0 right-0 left-0 z-10 h-[38px]"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />
      {/* Orb shader — dark circle at low opacity */}
      <div className="absolute inset-0 opacity-30">
        <Orb
          hue={0}
          hoverIntensity={0}
          rotateOnHover={false}
          forceHoverState={false}
          backgroundColor="#fafafa"
        />
      </div>

      {/* Center content */}
      <motion.div
        layout
        className="relative flex flex-col items-center"
        initial="initial"
        animate="animate"
        variants={{ initial: {}, animate: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Brand */}
        <motion.div layout="position" className="flex items-center gap-2 justify-center mb-6" variants={enterVariants}>
          <IconWorld className="size-6 relative top-0.25" />
          <p className="text-xl font-medium">Trove</p>
        </motion.div>

        {/* Cycling copy — word-level stagger */}
        <motion.div layout="position" className="flex mb-9 h-[4rem] items-center justify-center" variants={enterVariants}>
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseIndex}
              className="flex flex-wrap justify-center gap-x-[0.22em] text-5xl font-semibold tracking-tight text-foreground"
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ staggerChildren: 0.08 }}
            >
              {words.map((word, i) => (
                <motion.span key={i} variants={wordVariants}>
                  {word}
                </motion.span>
              ))}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Source tiles — macOS-style squares */}
        <motion.div layout="position" className="flex items-center gap-5 mb-16" variants={enterVariants}>
          {state.sourceStates.map((source, i) => {
            const config = getSourceConfig(
              getRegistrySourceId(source.sourceId),
            );
            const isActive = i === activeSyncIndex;
            const isDone = source.status === "succeeded";
            const isFailed = source.status === "failed";
            const isHn = source.sourceId === "hn";

            return (
              <motion.div
                key={source.sourceId}
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-2xl",
                  isActive && "bg-background shadow-lg",
                  isDone && "bg-white shadow-sm",
                  isFailed && "bg-red-500/10",
                  !isActive && !isDone && !isFailed && "bg-foreground/3",
                )}
                animate={{
                  opacity: isActive ? 1 : isDone ? 1 : 0.2,
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
              >
                <SourceIcon
                  config={config.icons}
                  className={cn(
                    isHn ? "size-full rounded-2xl" : "size-8",
                    !isHn && "opacity-70",
                  )}
                />
                {isDone && (
                  <div className="absolute -bottom-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground/80">
                    <IconCheckmark1 className="size-4 text-white" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Error message */}
        {meta.hasFailures && (
          <p className="text-[13px] text-red-300/60">
            Some sources need attention
          </p>
        )}

        {/* Action — only when done */}
        {state.status !== "syncing" && (
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
          >
            <Button
              className="min-w-[240px] bg-primary text-primary-foreground hover:bg-primary/90"
              shape="pill"
              size="lg"
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
            {meta.hasFailures && (
              <Button
                className="text-muted-foreground hover:text-foreground"
                shape="square"
                size="lg"
                onClick={() => void syncActions.retryFailed()}
              >
                Retry failed
              </Button>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
