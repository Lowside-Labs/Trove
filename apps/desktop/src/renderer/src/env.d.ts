/// <reference types="vite/client" />
import type { TroveDesktopApi } from "../../shared/bridge";

declare global {
  interface Window {
    troveDesktop: TroveDesktopApi;
  }
}
