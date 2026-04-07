import type { ReactNode, RefObject } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
} from "../../components/ui/popover";
import { ToggleGroup } from "../../components/ui/toggle-group";
import { cn } from "../../lib/cn";
import { formatKindLabel } from "../library/kind-label";
import { useSyncDialog } from "./sync-dialog-context";

interface SourceSyncPopoverProps {
  anchorRef: RefObject<Element | null>;
  sourceId: string;
}

export function SourceSyncPopover({ anchorRef, sourceId }: SourceSyncPopoverProps) {
  const { actions, meta, state } = useSyncDialog();
  const isOpen = state.isOpen && state.sourceId === sourceId;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          actions.close();
        }
      }}
    >
      <PopoverContent
        align="start"
        anchor={anchorRef}
        arrow={false}
        className="w-[340px] rounded-[28px] p-5"
        side="right"
        sideOffset={14}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <PopoverTitle className="text-xl font-semibold">
              {meta.title}
            </PopoverTitle>
            <PopoverDescription className="text-sm">
              {meta.description}
            </PopoverDescription>
          </div>

          {meta.kindOptions.length > 1 ? (
            <SyncSection label="Kind">
              <ToggleGroup.Root
                className="flex w-full flex-wrap gap-1 bg-transparent p-0 [&>[data-slot=toggle-group-item]]:basis-0 [&>[data-slot=toggle-group-item]]:flex-1 [&>[data-slot=toggle-group-item]]:justify-center"
                disabled={state.isSubmitting}
                size="sm"
                value={[state.kind ?? "__all"]}
                onValueChange={(value) => {
                  const nextValue = value[0];
                  if (!nextValue) {
                    return;
                  }
                  actions.setKind(nextValue === "__all" ? null : (nextValue ?? null));
                }}
              >
                <OptionToggle value="__all">All kinds</OptionToggle>
                {meta.kindOptions.map((kind) => (
                  <OptionToggle key={kind.id} value={kind.id}>
                    {formatKindLabel(kind.id)}
                  </OptionToggle>
                ))}
              </ToggleGroup.Root>
            </SyncSection>
          ) : null}

          <SyncSection label="Amount">
            <ToggleGroup.Root
              className="flex w-full flex-wrap gap-1 bg-transparent p-0 [&>[data-slot=toggle-group-item]]:basis-0 [&>[data-slot=toggle-group-item]]:flex-1 [&>[data-slot=toggle-group-item]]:justify-center"
              disabled={state.isSubmitting}
              size="sm"
              value={[state.limit == null ? "__all" : String(state.limit)]}
              onValueChange={(value) => {
                const nextValue = value[0];
                if (!nextValue) {
                  return;
                }
                actions.setLimit(nextValue === "__all" ? null : Number(nextValue));
              }}
            >
              {meta.limitOptions.map((option) => (
                <OptionToggle
                  key={option.value == null ? "__all" : String(option.value)}
                  value={option.value == null ? "__all" : String(option.value)}
                  {...(option.wide ? { className: "w-full basis-full flex-none" } : {})}
                >
                  {option.label}
                </OptionToggle>
              ))}
            </ToggleGroup.Root>
          </SyncSection>

          {meta.source?.requiresUser ? (
            <SyncSection label="Username">
              <Input
                autoFocus
                className="rounded-full bg-secondary px-4 transition-none focus:bg-secondary"
                disabled={state.isSubmitting}
                placeholder="Enter your username"
                value={state.user}
                onChange={(event) => actions.setUser(event.target.value)}
              />
            </SyncSection>
          ) : null}

          {state.error ? (
            <p className="text-[13px] leading-6 text-destructive">{state.error}</p>
          ) : null}

          <div className="space-y-2">
            <Button
              className="h-11 w-full rounded-full transition-none"
              disabled={!meta.canSubmit}
              variant="primary"
              onClick={() => {
                void actions.submit();
              }}
            >
              {state.isSubmitting ? "Syncing…" : meta.submitLabel}
            </Button>
            <Button
              className="h-11 w-full rounded-full transition-none"
              disabled={state.isSubmitting}
              variant="ghost"
              onClick={() => actions.close()}
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SyncSection({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[13px] font-medium text-muted-foreground">{label}</h3>
      {children}
    </section>
  );
}

function OptionToggle({
  children,
  className,
  value,
}: {
  children: ReactNode;
  className?: string;
  value: string;
}) {
  return (
    <ToggleGroup.Item
      className={cn("min-w-[unset] px-4 text-[13px] transition-none", className)}
      value={value}
    >
      {children}
    </ToggleGroup.Item>
  );
}
