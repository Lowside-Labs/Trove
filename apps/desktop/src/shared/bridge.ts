import type {
  GetLibraryItemInput,
  LibraryItemDetail,
  ListLibraryItemsInput,
  ListLibraryItemsResult,
  SystemCopyArchivePathResponse,
  SystemRevealArchivePathResponse,
  SyncStartRequest,
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
    start(input: SyncStartRequest): Promise<SyncStartResponse>;
  };
  system: {
    openExternal(url: string): Promise<void>;
    copyArchivePath(): Promise<SystemCopyArchivePathResponse>;
    revealArchivePath(): Promise<SystemRevealArchivePathResponse>;
  };
  theme: {
    get(): Promise<ThemeGetResponse>;
    set(preference: ThemePreference): Promise<ThemeSetResponse>;
  };
}
