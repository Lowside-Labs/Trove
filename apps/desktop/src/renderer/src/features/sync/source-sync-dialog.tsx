import type { ReactNode } from "react";
import { Select, SelectPrimitive } from "../../components/ui/select";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { formatKindLabel } from "../library/kind-label";
import { useSyncDialog } from "./sync-dialog-context";

export function SourceSyncDialog() {
  const { actions, meta, state } = useSyncDialog();

  return (
    <Dialog.Root open={state.isOpen} onOpenChange={(open) => {
      if (!open) {
        actions.close();
      }
    }}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{meta.title}</Dialog.Title>
          <Dialog.Description>{meta.description}</Dialog.Description>
        </Dialog.Header>

        <Dialog.Body className="space-y-6 py-4">
          {meta.kindOptions.length > 1 ? (
            <SyncField label="Kind">
              <Select.Root
                value={state.kind ?? "__all"}
                onValueChange={(value) => actions.setKind(value === "__all" ? null : value)}
              >
                <Select.TriggerInput />
                <Select.Content>
                  <Select.Option value="__all">
                    <SelectPrimitive.ItemText>All kinds</SelectPrimitive.ItemText>
                  </Select.Option>
                  {meta.kindOptions.map((kind) => (
                    <Select.Option key={kind.id} value={kind.id}>
                      <SelectPrimitive.ItemText>{formatKindLabel(kind.id)}</SelectPrimitive.ItemText>
                    </Select.Option>
                  ))}
                </Select.Content>
              </Select.Root>
            </SyncField>
          ) : null}

          <SyncField label="Amount">
            <Select.Root
              value={state.limit == null ? "__all" : String(state.limit)}
              onValueChange={(value) =>
                actions.setLimit(value === "__all" ? null : Number(value))
              }
            >
              <Select.TriggerInput />
              <Select.Content>
                {meta.limitOptions.map((option) => (
                  <Select.Option
                    key={option.value == null ? "__all" : String(option.value)}
                    value={option.value == null ? "__all" : String(option.value)}
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </Select.Option>
                ))}
              </Select.Content>
            </Select.Root>
          </SyncField>

          {meta.source?.requiresUser ? (
            <SyncField label="Username">
              <Input
                autoFocus
                placeholder="Enter your username"
                value={state.user}
                onChange={(event) => actions.setUser(event.target.value)}
              />
            </SyncField>
          ) : null}

          {state.error ? <p className="text-[13px] text-destructive">{state.error}</p> : null}
        </Dialog.Body>

        <Dialog.Footer>
          <Dialog.Close render={<Button variant="ghost" />}>Cancel</Dialog.Close>
          <Button
            disabled={!meta.canSubmit}
            variant="primary"
            onClick={() => {
              void actions.submit();
            }}
          >
            {state.isSubmitting ? "Syncing…" : meta.submitLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function SyncField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
