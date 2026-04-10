import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Orb } from "../../../components/orb";
import { useIsDark } from "../../../hooks/use-is-dark";
import IconWorld from "central-icons/IconWorld";
import { useOnboarding } from "../onboarding-context";
import { OnboardingSyncSourceTile } from "../onboarding-source-ui";
import { useOnboardingSync } from "../onboarding-sync-context";

const GRADIENT_LIGHT =
  "linear-gradient(180deg, oklch(0.97 0.005 270) 0%, oklch(0.985 0.002 280) 40%, oklch(1 0 0) 100%)";
const GRADIENT_DARK =
  "linear-gradient(180deg, oklch(0.17 0.005 270) 0%, oklch(0.155 0.002 280) 40%, oklch(0.145 0 0) 100%)";

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
  "Oh… you're into that",
  "Remember this one?",
  "Going way back",
  "You have great taste",
  "Grabbing the deep cuts",
  "Oh this is a good one",
  "No judgement",
  "Still scrolling your history",
  "Lots to work with here",
  "Saving the saves",
  "The internet remembers",
  "One more page of gold",
  "Your past self was busy",
  "Interesting… very interesting",
  "Worth the wait",
  "Collecting the collection",
  "You bookmarked that at 3am",
  "Down the rabbit hole",
  "There's more where that came from",
  "Hang tight, almost there",
  "Rounding up the strays",
  "Every click tells a story",
  "We won't tell anyone",
  "Bringing it all together",
  "You really went deep on this",
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
  const isDark = useIsDark();
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

  const completionPhrase = meta.hasFailures ? "Almost there" : "Your library is ready";
  const isComplete = state.status !== "syncing" && state.status !== "idle";
  const currentPhrase = isComplete
    ? completionPhrase
    : (SYNC_PHRASES[phraseIndex] ?? SYNC_PHRASES[0]!);
  const phraseKey = isComplete ? "completion" : `sync-${phraseIndex}`;
  const words = currentPhrase.split(" ");

  const activeSyncIndex = state.sourceStates.findIndex(
    (s) => s.status === "syncing",
  );
  const showRetry = meta.hasFailures && state.status !== "syncing";
  const showBackToSources = !meta.hasSucceeded && meta.hasFailures;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background text-foreground"
      style={{ background: isDark ? GRADIENT_DARK : GRADIENT_LIGHT }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut" }}
    >
      {/* macOS draggable region */}
      <div
        className="absolute top-0 right-0 left-0 z-10 h-[38px]"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />
      {/* Orb shader — emerges slowly with a subtle scale */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 2.5, ease: "easeOut" }}
      >
        <Orb
          hue={0}
          hoverIntensity={0}
          rotateOnHover={false}
          forceHoverState={false}
          backgroundColor={isDark ? "#1c1c1c" : "#fafafa"}
        />
      </motion.div>

      {/* Center content — delayed entrance after the atmosphere establishes */}
      <motion.div
        layout
        className="relative flex flex-col items-center"
        initial="initial"
        animate="animate"
        variants={{ initial: {}, animate: { transition: { delayChildren: 1, staggerChildren: 0.12 } } }}
      >
        {/* Brand */}
        <motion.div className="flex items-center gap-2 justify-center mb-6" variants={enterVariants}>
          <IconWorld className="size-6 relative top-0.25" />
          <p className="text-xl font-medium">Trove</p>
        </motion.div>

        {/* Cycling copy — word-level stagger */}
        <motion.div layout="position" className="flex mb-9 h-[4rem] items-center justify-center" variants={enterVariants}>
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseKey}
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

        <motion.div layout="position" className="flex items-center gap-5 mb-16" variants={enterVariants}>
          {state.sourceStates.map((source, i) => {
            const isActive = i === activeSyncIndex;

            return (
              <motion.div
                key={source.sourceId}
                animate={{
                  opacity: isActive || source.status === "succeeded" ? 1 : 0.35,
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
              >
                <OnboardingSyncSourceTile
                  isActive={isActive}
                  sourceId={source.sourceId}
                  status={source.status}
                />
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
              className="min-w-[240px]"
              variant="primary"
              shape="pill"
              size="lg"
              onClick={showBackToSources ? actions.goBack : actions.complete}
            >
              {showBackToSources ? "Back to Sources" : "Open Library"}
            </Button>
            {showRetry && (
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
    </motion.div>
  );
}
