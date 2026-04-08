import { useState } from "react";
import { ReadyWorkspaceRouter } from "./ready-workspace-router";
import { StatusScreen } from "./status-screen";
import { useWorkspaceSnapshot } from "./use-workspace-snapshot";
import { WorkspaceSetupScreen } from "./workspace-setup-screen";

export function WorkspaceGate() {
  const [skipWelcomeOnce, setSkipWelcomeOnce] = useState(false);
  const { error, isLoading, refresh, snapshot } = useWorkspaceSnapshot();

  if (isLoading && !snapshot) {
    return (
      <StatusScreen
        eyebrow="Loading"
        title="Opening your Trove library."
        body="The desktop shell is loading the current workspace through the typed Electron bridge."
      />
    );
  }

  if (error) {
    return (
      <StatusScreen
        eyebrow="Workspace Error"
        title="Trove could not load the workspace snapshot."
        body={error}
      />
    );
  }

  if (!snapshot || snapshot.status === "missing") {
    return snapshot ? (
      <WorkspaceSetupScreen
        onRefreshSnapshot={refresh}
        onWorkspaceConfigured={() => {
          setSkipWelcomeOnce(true);
        }}
        snapshot={snapshot}
      />
    ) : (
      <StatusScreen
        eyebrow="Workspace Required"
        title="No Trove workspace is configured yet."
        body="Trove could not discover a workspace and could not build the setup flow."
      />
    );
  }

  return (
    <ReadyWorkspaceRouter
      {...(skipWelcomeOnce ? { initialOnboardingStep: "sources" as const } : {})}
      snapshot={snapshot}
      onRefreshSnapshot={refresh}
    />
  );
}
