import { useState } from "react";
import type { WorkspaceSnapshot } from "trove-contracts";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../components/ui/button";
import { OnboardingLayout } from "../features/onboarding/onboarding-shell";

type MissingWorkspaceSnapshot = Extract<WorkspaceSnapshot, { status: "missing" }>;
type WorkspaceSetupStep = "welcome" | "workspace";

interface WorkspaceSetupScreenProps {
  onRefreshSnapshot(): void;
  onWorkspaceConfigured(): void;
  snapshot: MissingWorkspaceSnapshot;
}

type WorkspaceAction = "create-suggested" | "choose-folder";

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

export function WorkspaceSetupScreen({
  onRefreshSnapshot,
  onWorkspaceConfigured,
  snapshot,
}: WorkspaceSetupScreenProps) {
  const [activeAction, setActiveAction] = useState<WorkspaceAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<WorkspaceSetupStep>("welcome");
  const suggestedRoot = snapshot.setup.suggestedRoot;

  async function configureWorkspace(root: string) {
    await window.troveDesktop.workspace.setRoot({
      root,
      createIfMissing: true,
    });
    onWorkspaceConfigured();
    onRefreshSnapshot();
  }

  async function useSuggestedFolder() {
    setActiveAction("create-suggested");
    setError(null);

    try {
      await configureWorkspace(suggestedRoot);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setActiveAction(null);
    }
  }

  async function chooseAnotherFolder() {
    setActiveAction("choose-folder");
    setError(null);

    try {
      const selection = await window.troveDesktop.workspace.pickDirectory({
        purpose: "create",
        defaultPath: suggestedRoot,
      });

      if (!selection.canceled && selection.path) {
        await configureWorkspace(selection.path);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setActiveAction(null);
    }
  }

  if (step === "welcome") {
    return (
      <OnboardingLayout.Root>
        <AnimatePresence mode="wait">
          <motion.div
            key="welcome"
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
                <OnboardingLayout.Title>All your saves{"\n"}in one place</OnboardingLayout.Title>
              </motion.div>
              <motion.div variants={childVariants}>
                <OnboardingLayout.Description>
                  Bookmarks, conversations, and stars. One archive you can search, browse, and sync.
                </OnboardingLayout.Description>
              </motion.div>
            </OnboardingLayout.Header>
            <motion.div variants={childVariants}>
              <OnboardingLayout.Content>
                <OnboardingLayout.StepBody>
                  <OnboardingLayout.Actions
                    primary={
                      <Button
                        className="w-full"
                        size="lg"
                        shape="square"
                        variant="primary"
                        onClick={() => {
                          setStep("workspace");
                        }}
                      >
                        Get Started
                      </Button>
                    }
                  />
                </OnboardingLayout.StepBody>
              </OnboardingLayout.Content>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </OnboardingLayout.Root>
    );
  }

  return (
    <OnboardingLayout.Root>
      <AnimatePresence mode="wait">
        <motion.div
          key="workspace"
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
              <OnboardingLayout.Title>Choose your{"\n"}Trove folder</OnboardingLayout.Title>
            </motion.div>
            <motion.div variants={childVariants}>
              <OnboardingLayout.Description>
                Your saves live in one local folder.
              </OnboardingLayout.Description>
            </motion.div>
          </OnboardingLayout.Header>
          <motion.div variants={childVariants}>
            <OnboardingLayout.Content>
              <OnboardingLayout.StepBody>
                <OnboardingLayout.Actions
                  primary={
                    <>
                      <div className="rounded-xl bg-foreground/[0.04] px-4 py-3 mb-3">
                        <p className="text-sm text-muted-foreground">
                          Default folder:{" "}
                          <span className="font-mono text-foreground/80">{suggestedRoot}</span>
                        </p>
                      </div>
                      {error ? (
                        <p className="mb-3 max-w-[44ch] text-sm leading-relaxed text-destructive">{error}</p>
                      ) : null}
                      <Button
                        className="w-full"
                        loading={activeAction === "create-suggested"}
                        size="lg"
                        shape="square"
                        variant="primary"
                        onClick={() => {
                          void useSuggestedFolder();
                        }}
                      >
                        Create Trove folder
                      </Button>
                    </>
                  }
                  secondary={
                    <OnboardingLayout.SecondaryAction
                      onClick={() => {
                        void chooseAnotherFolder();
                      }}
                    >
                      Choose a folder
                    </OnboardingLayout.SecondaryAction>
                  }
                />
              </OnboardingLayout.StepBody>
            </OnboardingLayout.Content>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </OnboardingLayout.Root>
  );
}
