import { AnimatePresence, motion, type Variant, type Variants } from "motion/react";
import { Button } from "../../../components/ui/button";
import { useOnboarding } from "../onboarding-context";
import {
  OnboardingSelectedSourcesInline,
  OnboardingSourceSelectionTile,
  OnboardingSourceUsernameInput,
  sortOnboardingSources,
} from "../onboarding-source-ui";
import { OnboardingLayout } from "../onboarding-shell";

const gridVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

export function OnboardingSourceSelectionStep() {
  const { actions, meta, state } = useOnboarding();
  const selectedSourceIds = state.selection.sourceIds;
  const sortedSources = sortOnboardingSources(meta.availableSources);
  const needsRoamOpen = selectedSourceIds.includes("chatgpt") || selectedSourceIds.includes("claude");

  return (
    <OnboardingLayout.StepBody>
      <div className="w-full justify-center items-center flex flex-col">
      <motion.div
        className="grid w-full grid-cols-2 gap-6 md:grid-cols-4"
        variants={gridVariants}
        initial="initial"
        animate="animate"
      >
        {sortedSources.map((source) => {
          const isSelected = selectedSourceIds.includes(source.id);

          return (
            <motion.div
              key={source.id}
              variants={itemVariants}
            >
              <OnboardingSourceSelectionTile
                isSelected={isSelected}
                source={source}
                onSelect={() => actions.toggleSource(source.id)}
              />
            </motion.div>
          );
        })}
      </motion.div>

    <AnimatePresence initial={false}>

      {selectedSourceIds.includes("hn") && (
        <motion.div
          className="w-full max-w-[280px]"
          initial={{ opacity: 0, height: 0, marginTop: 0, filter: "blur(6px)" }}
          animate={{ opacity: 1, height: "auto", marginTop: 32, filter: "blur(0px)" }}
          exit={{ opacity: 0, height: 0, marginTop: 0, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 36, velocity: 2 }}
        >
          <OnboardingSourceUsernameInput
            value={state.selection.hnUsername}
            onChange={actions.setHnUsername}
          />
        </motion.div>
      )}
      </AnimatePresence>
      </div>

      <motion.div
        layout
        className="flex w-full max-w-[480px] flex-col items-center"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <AnimatePresence initial={false}>
          {needsRoamOpen ? (
            <motion.div
              key="chrome-note"
              className="w-full overflow-hidden"
              initial={{ height: 0, opacity: 0, filter: "blur(6px)" }}
              animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
              exit={{ height: 0, opacity: 0, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 500, damping: 30, velocity: 5 }}
            >
              <p className="text-center text-sm text-muted-foreground">
                Keep Chrome open and make sure you&apos;re signed in.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <OnboardingLayout.Actions
          primary={
            <Button
              className="w-full mt-2"
              disabled={selectedSourceIds.length === 0}
              size="lg"
              shape="square"
              variant="primary"
              onClick={actions.continue}
            >
              {selectedSourceIds.length === 0 ? (
                "Select a source to continue"
              ) : (
                <>
                  <span>Continue with</span>
                  <OnboardingSelectedSourcesInline sourceIds={selectedSourceIds} />
                </>
              )}
            </Button>
          }
        />
      </motion.div>
    </OnboardingLayout.StepBody>
  );
}
