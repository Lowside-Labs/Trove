import { useState } from "react";
import type { WorkspaceSetup } from "trove-contracts";
import { Button } from "../components/ui/button";
import { OnboardingLayout } from "../features/onboarding/onboarding-shell";

type RecoveryAction = "create-suggested" | "choose-folder";

interface WorkspaceRecoveryScreenProps {
  setup?: WorkspaceSetup;
  onRecovered(): void;
}

export function WorkspaceRecoveryScreen({
  setup,
  onRecovered,
}: WorkspaceRecoveryScreenProps) {
  const [activeAction, setActiveAction] = useState<RecoveryAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suggestedRoot = setup?.suggestedRoot;

  async function configureWorkspace(root: string) {
    await window.troveDesktop.workspace.setRoot({
      root,
      createIfMissing: true,
    });
    onRecovered();
  }

  async function useSuggestedFolder() {
    if (!suggestedRoot) return;
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
        purpose: "open",
        ...(suggestedRoot ? { defaultPath: suggestedRoot } : {}),
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

  return (
    <OnboardingLayout.Root>
      <OnboardingLayout.Header>
        <OnboardingLayout.Brand>Trove</OnboardingLayout.Brand>
        <OnboardingLayout.Title>
          {"Trove folder\nnot found"}
        </OnboardingLayout.Title>
        <OnboardingLayout.Description>
          Pick your existing folder or create a new one.
        </OnboardingLayout.Description>
      </OnboardingLayout.Header>
      <OnboardingLayout.Content>
        <OnboardingLayout.StepBody>
          <OnboardingLayout.Actions
            primary={
              <>
                {suggestedRoot && (
                  <div className="rounded-xl bg-foreground/[0.04] px-4 py-3 mb-3">
                    <p className="text-sm text-muted-foreground">
                      Default folder:{" "}
                      <span className="font-mono text-foreground/80">{suggestedRoot}</span>
                    </p>
                  </div>
                )}
                {error ? (
                  <p className="mb-3 max-w-[44ch] text-sm leading-relaxed text-destructive">{error}</p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={!suggestedRoot}
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
                Locate existing folder
              </OnboardingLayout.SecondaryAction>
            }
          />
        </OnboardingLayout.StepBody>
      </OnboardingLayout.Content>
    </OnboardingLayout.Root>
  );
}
