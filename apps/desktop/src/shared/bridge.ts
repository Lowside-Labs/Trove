import type {
  GetLibraryItemInput,
  LibraryItemDetail,
  ListLibraryItemsInput,
  ListLibraryItemsResult,
  SyncStartResponse,
  ThemeGetResponse,
  ThemePreference,
  ThemeSetResponse,
  WorkspaceSnapshot,
} from "trove-contracts";

export interface TroveDesktopApi {
  workspace: {
    getSnapshot(): Promise<WorkspaceSnapshot>;
  };
  library: {
    listItems(input?: ListLibraryItemsInput): Promise<ListLibraryItemsResult>;
    getItem(input: GetLibraryItemInput): Promise<LibraryItemDetail | null>;
  };
  sync: {
    start(source: string): Promise<SyncStartResponse>;
  };
  system: {
    openExternal(url: string): Promise<void>;
  };
  theme: {
    get(): Promise<ThemeGetResponse>;
    set(preference: ThemePreference): Promise<ThemeSetResponse>;
  };
}
