import { AnimatePresence, motion } from "motion/react";
import { OnboardingProvider, useOnboarding } from "./onboarding-context";
import { getOnboardingStepPresentation } from "./onboarding-step-registry";
import { OnboardingLayout } from "./onboarding-shell";
import { OnboardingSyncProvider } from "./onboarding-sync-context";
import type { ReadyWorkspaceSnapshot } from "./onboarding-types";

interface OnboardingScreenProps {
  isForcedPreview: boolean;
  onComplete(): void;
  onRefreshSnapshot(): void;
  snapshot: ReadyWorkspaceSnapshot;
}

export function OnboardingScreen({
  isForcedPreview,
  onComplete,
  onRefreshSnapshot,
  snapshot,
}: OnboardingScreenProps) {
  return (
    <OnboardingProvider
      isForcedPreview={isForcedPreview}
      onComplete={onComplete}
      snapshot={snapshot}
    >
      <OnboardingScreenContent onRefreshSnapshot={onRefreshSnapshot} />
    </OnboardingProvider>
  );
}

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.1 },
  },
  exit: {
    transition: { staggerChildren: 0.04, staggerDirection: -1 },
  },
};

const childTransition = { type: "spring" as const, stiffness: 300, damping: 28 };

const childVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: childTransition,
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: childTransition,
  },
};

function OnboardingScreenContent({
  onRefreshSnapshot,
}: {
  onRefreshSnapshot(): void;
}) {
  const { state, meta } = useOnboarding();
  const stepPresentation = getOnboardingStepPresentation(state.step);
  const StepComponent = stepPresentation.Component;
  const isSyncStep = state.step === "sync";

  return (
    <OnboardingSyncProvider
      hnUsername={state.selection.hnUsername}
      onRefreshSnapshot={onRefreshSnapshot}
      selectedSources={meta.selectedSources}
    >
      {isSyncStep ? (
        /* Sync step renders full-screen, bypassing the shell */
        <StepComponent />
      ) : (
        <OnboardingLayout.Root>
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              className="w-full"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <OnboardingLayout.Header>
                <motion.div variants={childVariants}>
                  <OnboardingLayout.Brand>Trove</OnboardingLayout.Brand>
                </motion.div>
                <motion.div variants={childVariants}>
                  <OnboardingLayout.Title>
                    {stepPresentation.title}
                  </OnboardingLayout.Title>
                </motion.div>
                <motion.div variants={childVariants}>
                  <OnboardingLayout.Description>
                    {stepPresentation.description}
                  </OnboardingLayout.Description>
                </motion.div>
              </OnboardingLayout.Header>
              <motion.div variants={childVariants}>
                <OnboardingLayout.Content>
                  <StepComponent />
                </OnboardingLayout.Content>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </OnboardingLayout.Root>
      )}
    </OnboardingSyncProvider>
  );
}
