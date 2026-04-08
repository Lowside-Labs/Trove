import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, use } from "react";
import { cn } from "../../lib/cn";

type ToggleGroupContextValue = {
  size: ToggleGroupRootProps["size"];
  variant: ToggleGroupRootProps["variant"];
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext() {
  return use(ToggleGroupContext);
}

const toggleGroupVariants = cva(
  [
    "inline-flex items-center rounded-full",
    "data-[orientation=vertical]:flex-col",
    "bg-muted/50",
  ],
  {
    variants: {
      variant: {
        default: "gap-0",
        ghost: "gap-1 bg-transparent p-0 shadow-none",
      },
      size: {
        sm: "",
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const toggleItemVariants = cva(
  [
    "font-weight-control relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "cursor-pointer touch-manipulation select-none",
    "group-data-[orientation=vertical]/toggle-group:w-full",
    "focus-visible:outline-ring focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:hover:bg-background",
          "[[data-theme=dark]_&]:data-[pressed]:bg-accent [[data-theme=dark]_&]:data-[pressed]:text-accent-foreground [[data-theme=dark]_&]:data-[pressed]:hover:bg-accent",
          "[.dark_&]:data-[pressed]:bg-accent [.dark_&]:data-[pressed]:text-accent-foreground [.dark_&]:data-[pressed]:hover:bg-accent",
          "data-[pressed]:shadow-outline-1 data-[pressed]:shadow-sm",
          "data-[disabled]:data-[pressed]:shadow-none",
          "[&[data-pressed]:has(+[data-pressed])]:rounded-r-none",
          "[[data-pressed]+&[data-pressed]]:rounded-l-none",
          "group-data-[orientation=vertical]/toggle-group:[&[data-pressed]:has(+[data-pressed])]:rounded-r-md group-data-[orientation=vertical]/toggle-group:[&[data-pressed]:has(+[data-pressed])]:rounded-b-none",
          "group-data-[orientation=vertical]/toggle-group:[[data-pressed]+&[data-pressed]]:rounded-t-none group-data-[orientation=vertical]/toggle-group:[[data-pressed]+&[data-pressed]]:rounded-l-md",
        ],
        ghost: [
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "data-[pressed]:bg-accent data-[pressed]:text-foreground",
        ],
      },
      size: {
        sm: "h-7 rounded-full px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-8 rounded-full px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleGroupRootProps = Omit<
  React.ComponentProps<typeof BaseToggleGroup>,
  "className"
> &
  VariantProps<typeof toggleGroupVariants> & {
    className?: string;
  };

function ToggleGroupRoot({
  children,
  className,
  size = "default",
  variant = "default",
  ...props
}: ToggleGroupRootProps) {
  return (
    <ToggleGroupContext value={{ size, variant }}>
      <BaseToggleGroup
        data-slot="toggle-group"
        className={cn(toggleGroupVariants({ size, variant }), className)}
        {...props}
      >
        {children}
      </BaseToggleGroup>
    </ToggleGroupContext>
  );
}

type ToggleGroupItemProps = Omit<React.ComponentProps<typeof BaseToggle>, "className"> &
  VariantProps<typeof toggleItemVariants> & {
    className?: string;
  };

function ToggleGroupItem({
  children,
  className,
  size,
  variant,
  ...props
}: ToggleGroupItemProps) {
  const context = useToggleGroupContext();
  const resolvedSize = size ?? context?.size ?? "default";
  const resolvedVariant = variant ?? context?.variant ?? "default";

  return (
    <BaseToggle
      data-slot="toggle-group-item"
      className={cn(
        toggleItemVariants({ size: resolvedSize, variant: resolvedVariant }),
        className,
      )}
      {...props}
    >
      {children}
    </BaseToggle>
  );
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
  Root: ToggleGroupRoot,
  Item: ToggleGroupItem,
});
