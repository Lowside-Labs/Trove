import { AppShell } from "./app-shell";
import { StatusScreen } from "./status-screen";
import { useWorkspaceSnapshot } from "./use-workspace-snapshot";

export function WorkspaceGate() {
  const { error, isLoading, snapshot } = useWorkspaceSnapshot();

  if (isLoading) {
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
    return (
      <StatusScreen
        eyebrow="Workspace Required"
        title="No Trove workspace is configured yet."
        body={snapshot?.message ?? "No Trove workspace was found."}
        hint="Run `trove init --path ~/Trove` or launch the app with `TROVE_HOME` pointing at an existing workspace."
      />
    );
  }

  return <AppShell snapshot={snapshot} />;
}
