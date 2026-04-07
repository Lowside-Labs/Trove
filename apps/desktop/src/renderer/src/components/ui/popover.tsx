import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { cn } from "../../lib/cn";

const Popover = BasePopover.Root;

type PopoverTriggerProps = ComponentProps<typeof BasePopover.Trigger>;

function PopoverTrigger({ children, ...props }: PopoverTriggerProps) {
  return (
    <BasePopover.Trigger {...props} render={props.render}>
      {children}
    </BasePopover.Trigger>
  );
}

type PopoverContentProps = {
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  arrow?: boolean;
  arrowClassName?: string;
  anchor?: Element | RefObject<Element | null> | null;
};

function PopoverContent({
  children,
  className,
  side = "bottom",
  sideOffset = 10,
  align = "start",
  alignOffset = 0,
  arrow = true,
  arrowClassName,
  anchor,
}: PopoverContentProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="z-50"
        {...(anchor ? { anchor } : {})}
      >
        <BasePopover.Popup
          className={cn(
            "max-h-[var(--available-height)] min-w-[220px] max-w-[360px] overflow-y-auto",
            "rounded-2xl bg-popover p-4 text-popover-foreground shadow-outline shadow-lg outline-none",
            "origin-[var(--transform-origin)]",
            "transition-[opacity,filter,transform] duration-150 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
            "data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 data-[starting-style]:blur-[4px]",
            "data-[ending-style]:translate-y-1 data-[ending-style]:opacity-0 data-[ending-style]:blur-[4px]",
            className,
          )}
        >
          {arrow ? (
            <BasePopover.Arrow className={cn("fill-popover", arrowClassName)} />
          ) : null}
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

type PopoverTitleProps = ComponentProps<typeof BasePopover.Title>;

function PopoverTitle({ children, className, ...props }: PopoverTitleProps) {
  return (
    <BasePopover.Title className={cn("text-sm font-semibold text-foreground", className)} {...props}>
      {children}
    </BasePopover.Title>
  );
}

type PopoverDescriptionProps = ComponentProps<typeof BasePopover.Description>;

function PopoverDescription({
  children,
  className,
  ...props
}: PopoverDescriptionProps) {
  return (
    <BasePopover.Description
      className={cn("mt-1 text-sm leading-6 text-muted-foreground", className)}
      {...props}
    >
      {children}
    </BasePopover.Description>
  );
}

type PopoverCloseProps = ComponentProps<typeof BasePopover.Close>;

function PopoverClose({ children, ...props }: PopoverCloseProps) {
  return <BasePopover.Close {...props}>{children}</BasePopover.Close>;
}

export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
};

export type {
  PopoverCloseProps,
  PopoverContentProps,
  PopoverDescriptionProps,
  PopoverTitleProps,
  PopoverTriggerProps,
};
