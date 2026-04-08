import { Button } from "../components/ui/button";

interface AppDockProps {
  canOpenSource: boolean;
  onFocusSearch(): void;
  onOpenSource(): void;
}

export function AppDock({ canOpenSource, onFocusSearch, onOpenSource }: AppDockProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/78 p-2 shadow-[0_20px_60px_rgba(27,20,10,0.18)] ring-1 ring-black/10 backdrop-blur-xl">
        <Button variant="primary" size="sm">
          Library
        </Button>
        <Button variant="ghost" size="sm" onClick={onFocusSearch}>
          Search
        </Button>
        <Button variant="ghost" size="sm" disabled={!canOpenSource} onClick={onOpenSource}>
          Open Source
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Sync Soon
        </Button>
      </div>
    </div>
  );
}
