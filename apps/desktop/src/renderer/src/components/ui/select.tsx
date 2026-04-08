import { Select as BaseSelect } from "@base-ui/react/select";
import IconCheckmark1 from "central-icons/IconCheckmark1";
import IconChevronDownMedium from "central-icons/IconChevronDownMedium";
import IconChevronTopMedium from "central-icons/IconChevronTopMedium";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

function Trigger({
  children,
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Trigger> & { className?: string }) {
  return (
    <BaseSelect.Trigger
      className={cn(
        "inline-flex h-8 w-fit cursor-pointer items-center justify-between gap-2 rounded-full px-3",
        "bg-secondary text-secondary-foreground transition hover:bg-accent",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        "data-[placeholder]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </BaseSelect.Trigger>
  );
}

function Value(props: ComponentProps<typeof BaseSelect.Value>) {
  return <BaseSelect.Value className="truncate text-[13px] font-medium" {...props} />;
}

function Icon(props: ComponentProps<typeof BaseSelect.Icon>) {
  return (
    <BaseSelect.Icon className="shrink-0 text-muted-foreground" {...props}>
      <IconChevronDownMedium className="size-4" />
    </BaseSelect.Icon>
  );
}

function Content({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner side="bottom" sideOffset={8} align="end" className="z-50">
        <BaseSelect.Popup
          className={cn(
            "min-w-[180px] rounded-2xl bg-popover/96 p-1.5 text-popover-foreground shadow-[0_22px_60px_rgba(17,13,9,0.18)] ring-1 ring-black/7 backdrop-blur-xl",
            "max-h-[var(--available-height)] overflow-y-auto outline-none",
            className,
          )}
        >
          <BaseSelect.ScrollUpArrow className="sticky top-0 z-10 flex h-6 w-full items-center justify-center rounded-t-[16px] bg-popover text-muted-foreground">
            <IconChevronTopMedium className="size-4" />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List className="p-1">{children}</BaseSelect.List>
          <BaseSelect.ScrollDownArrow className="sticky bottom-0 z-10 flex h-6 w-full items-center justify-center rounded-b-[16px] bg-popover text-muted-foreground">
            <IconChevronDownMedium className="size-4" />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

function Option({
  children,
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Item> & { className?: string }) {
  return (
    <BaseSelect.Item
      className={cn(
        "relative flex cursor-pointer items-center rounded-xl px-3 py-2 pr-8 text-[14px] font-medium outline-none select-none",
        "data-[highlighted]:bg-accent data-[selected]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.ItemIndicator className="absolute right-2 inline-flex size-4 items-center justify-center">
        <IconCheckmark1 className="size-4" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

function TriggerInput({
  className,
  placeholder,
  ...props
}: Omit<ComponentProps<typeof BaseSelect.Trigger>, "children" | "className"> & {
  className?: string;
  placeholder?: string;
}) {
  return (
    <Trigger {...props} {...(className ? { className } : {})}>
      <Value placeholder={placeholder} />
      <Icon />
    </Trigger>
  );
}

function ItemText(props: ComponentProps<typeof BaseSelect.ItemText>) {
  return <BaseSelect.ItemText className="flex items-center" {...props} />;
}

export const Select = {
  Root: BaseSelect.Root,
  Trigger,
  TriggerInput,
  Value,
  Icon,
  Content,
  Option,
};

export const SelectPrimitive = {
  ItemText,
};
