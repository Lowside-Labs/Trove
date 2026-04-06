import type { WorkspaceSnapshot } from "trove-contracts";

export interface TroveDesktopApi {
  workspace: {
    getSnapshot(): Promise<WorkspaceSnapshot>;
  };
}
