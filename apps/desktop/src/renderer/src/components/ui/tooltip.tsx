import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type TooltipProviderProps = ComponentProps<typeof BaseTooltip.Provider>;

function TooltipProvider({
  children,
  delay = 180,
  closeDelay = 0,
  ...props
}: TooltipProviderProps) {
  return (
    <BaseTooltip.Provider closeDelay={closeDelay} delay={delay} {...props}>
      {children}
    </BaseTooltip.Provider>
  );
}

type TooltipContentProps = {
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  arrow?: boolean;
};

function TooltipContent({
  children,
  className,
  side = "top",
  sideOffset = 10,
  align = "center",
  alignOffset = 0,
  arrow = true,
}: TooltipContentProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        align={align}
        alignOffset={alignOffset}
        className="z-50"
        side={side}
        sideOffset={sideOffset}
      >
        <BaseTooltip.Popup
          className={cn(
            "rounded-full bg-foreground px-3 py-1.5 text-[12px] font-medium tracking-[-0.01em] text-background shadow-lg",
            className,
          )}
        >
          {arrow ? (
            <BaseTooltip.Arrow className="data-[side=top]:bottom-0.5 data-[side=top]:translate-y-full data-[side=top]:rotate-180 data-[side=bottom]:top-0.5 data-[side=bottom]:-translate-y-full data-[side=left]:-right-3 data-[side=left]:rotate-90 data-[side=right]:-left-3 data-[side=right]:-rotate-90">
              <ArrowSvg />
            </BaseTooltip.Arrow>
          ) : null}
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

function ArrowSvg(props: ComponentProps<"svg">) {
  return (
    <svg fill="none" height="10" viewBox="0 0 20 10" width="20" {...props}>
      <path
        className="fill-foreground"
        d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
      />
    </svg>
  );
}

export const Tooltip = {
  Provider: TooltipProvider,
  Root: BaseTooltip.Root,
  Trigger: BaseTooltip.Trigger,
  Content: TooltipContent,
};
