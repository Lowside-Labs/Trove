import IconCheckmark1 from "central-icons-bold/IconCheckmark1";
import { motion } from "motion/react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/cn";
import {
  getSourceConfig,
  SourceIcon,
} from "../../library/source-registry";
import { useOnboarding } from "../onboarding-context";
import { OnboardingLayout } from "../onboarding-shell";

const gridVariants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
};

function getRegistrySourceId(sourceId: string): string {
  if (sourceId === "hn") return "hackernews";
  return sourceId;
}

const SOURCE_DISPLAY_ORDER = ["x", "instagram", "github", "chatgpt", "claude", "substack", "hn"];

export function OnboardingSourceSelectionStep() {
  const { actions, meta, state } = useOnboarding();
  const selectedSourceIds = state.selection.sourceIds;

  const sortedSources = [...meta.availableSources].sort((a, b) => {
    const ai = SOURCE_DISPLAY_ORDER.indexOf(a.id);
    const bi = SOURCE_DISPLAY_ORDER.indexOf(b.id);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });

  return (
    <OnboardingLayout.StepBody>
      <motion.div
        className="grid w-full grid-cols-4 gap-6"
        variants={gridVariants}
        initial="initial"
        animate="animate"
      >
        {sortedSources.map((source) => {
          const config = getSourceConfig(getRegistrySourceId(source.id));
          const isSelected = selectedSourceIds.includes(source.id);
          const isHn = source.id === "hn";

          return (
            <motion.button
              key={source.id}
              type="button"
              className="flex cursor-pointer flex-col items-center gap-3 select-none"
              variants={itemVariants}
              onClick={() => actions.toggleSource(source.id)}
            >
              {/* Icon container with check badge */}
              <div className="relative">
                <div
                  className={cn(
                    "flex size-28 items-center justify-center rounded-3xl transition-all duration-200",
                    isSelected
                      ? "bg-foreground/[0.12] shadow-md"
                      : "bg-foreground/[0.06] opacity-50",
                  )}
                >
                  <SourceIcon
                    config={config.icons}
                    className={isHn ? "size-full rounded-3xl" : "size-12"}
                  />
                </div>
                {isSelected && (
                  <div className="absolute -right-2 -bottom-2 flex size-7 items-center justify-center rounded-full bg-foreground">
                    <IconCheckmark1 className="size-4 text-background" />
                  </div>
                )}
              </div>

              {/* Name */}
              <span
                className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  isSelected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {source.displayName}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* HN username input — shown below the grid when HN is selected */}
      {selectedSourceIds.includes("hn") && (
        <motion.div
          className="w-full max-w-[280px]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 28 }}
        >
          <input
            className="w-full rounded-xl bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/10"
            placeholder="Your Hacker News username"
            type="text"
            value={state.selection.hnUsername}
            onChange={(e) => actions.setHnUsername(e.target.value)}
          />
        </motion.div>
      )}

      <OnboardingLayout.Actions
        primary={
          <Button
            className="w-full"
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
                <span className="inline-flex items-center -space-x-2">
                  {selectedSourceIds.map((id) => {
                    const config = getSourceConfig(getRegistrySourceId(id));
                    const hasOwnBg = id === "hn";
                    return (
                      <span
                        key={id}
                        className="relative inline-flex size-6 items-center justify-center rounded-full bg-primary p-[3px]"
                      >
                        <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-foreground/20">
                          <SourceIcon
                            config={config.icons}
                            className={
                              hasOwnBg
                                ? "size-full"
                                : "size-3 brightness-0 invert"
                            }
                          />
                        </span>
                      </span>
                    );
                  })}
                </span>
              </>
            )}
          </Button>
        }
        secondary={
          <OnboardingLayout.SecondaryAction onClick={actions.goBack}>
            Back
          </OnboardingLayout.SecondaryAction>
        }
      />
    </OnboardingLayout.StepBody>
  );
}
