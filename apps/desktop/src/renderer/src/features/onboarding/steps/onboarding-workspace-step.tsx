import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { useOnboarding } from "../onboarding-context";
import { OnboardingLayout } from "../onboarding-shell";

type WorkspaceAction = "create-suggested" | "choose-folder";

export function OnboardingWorkspaceStep() {
  const { actions, meta } = useOnboarding();
  const [activeAction, setActiveAction] = useState<WorkspaceAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedRoot = meta.workspaceSetup?.suggestedRoot;

  async function configureWorkspace(root: string) {
    const snapshot = await window.troveDesktop.workspace.setRoot({
      root,
      createIfMissing: true,
    });
    actions.setReadySnapshot(snapshot);
    actions.continue();
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
        purpose: "create",
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
            Choose a folder
          </OnboardingLayout.SecondaryAction>
        }
      />
    </OnboardingLayout.StepBody>
  );
}
