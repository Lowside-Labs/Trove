import { WorkspaceGate } from "./app/workspace-gate";

const IS_MAC = navigator.platform.startsWith("Mac");

export function App() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* macOS: draggable region where traffic lights sit (hiddenInset) */}
      {IS_MAC ? (
        <div
          className="h-[38px] w-full shrink-0"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <WorkspaceGate />
      </div>
    </div>
  );
}
