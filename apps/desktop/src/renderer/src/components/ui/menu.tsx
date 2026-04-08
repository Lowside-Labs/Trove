import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type MenuTriggerProps = ComponentProps<typeof BaseMenu.Trigger>;

function MenuTrigger({ children, ...props }: MenuTriggerProps) {
  return (
    <BaseMenu.Trigger {...props} render={props.render}>
      {children}
    </BaseMenu.Trigger>
  );
}

interface MenuContentProps {
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
}

function MenuContent({
  align = "start",
  alignOffset = 0,
  children,
  className,
  side = "bottom",
  sideOffset = 10,
}: MenuContentProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="z-50 outline-none"
      >
        <BaseMenu.Popup
          className={cn(
            "min-w-[180px] rounded-2xl bg-popover/96 p-1.5 text-popover-foreground shadow-[0_22px_60px_rgba(17,13,9,0.18)] ring-1 ring-black/7 backdrop-blur-xl",
            "origin-[var(--transform-origin)] data-[ending-style]:scale-98 data-[ending-style]:opacity-0 data-[starting-style]:scale-98 data-[starting-style]:opacity-0",
            className,
          )}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

type MenuItemProps = ComponentProps<typeof BaseMenu.Item> & {
  className?: string;
};

function MenuItem({ children, className, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item
      className={cn(
        "flex cursor-default items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground outline-none select-none cursor-pointer",
        "data-[highlighted]:bg-muted data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </BaseMenu.Item>
  );
}

function MenuSeparator({ className }: { className?: string }) {
  return <BaseMenu.Separator className={cn("my-1 h-px bg-border/80", className)} />;
}

export const Menu = {
  Root: BaseMenu.Root,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
};
