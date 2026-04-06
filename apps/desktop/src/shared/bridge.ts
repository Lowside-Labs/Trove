import type {
  GetLibraryItemInput,
  LibraryItemDetail,
  LibraryItemSummary,
  ListLibraryItemsInput,
  WorkspaceSnapshot,
} from "trove-contracts";

export interface TroveDesktopApi {
  workspace: {
    getSnapshot(): Promise<WorkspaceSnapshot>;
  };
  library: {
    listItems(input?: ListLibraryItemsInput): Promise<LibraryItemSummary[]>;
    getItem(input: GetLibraryItemInput): Promise<LibraryItemDetail | null>;
  };
  system: {
    openExternal(url: string): Promise<void>;
  };
}
