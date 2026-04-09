import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Children, type ReactNode } from "react";
import { cn } from "../../lib/cn";

function wrapTextChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <span className="truncate">{child}</span>;
    }

    return child;
  });
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("animate-sync-spinner", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
        fill="currentColor"
      />
    </svg>
  );
}

const buttonVariants = cva(
  [
    "font-semibold relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap",
    "cursor-pointer touch-manipulation select-none",
    "focus-visible:outline-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&>span>svg:first-child:not(:last-child)]:ml-[var(--icon-inset)] [&>span>svg:last-child:not(:first-child)]:mr-[var(--icon-inset)]",
    "aria-invalid:outline-destructive aria-invalid:border-destructive",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 aria-expanded:bg-primary/80 btn-primary-dark",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 aria-expanded:bg-secondary/70",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80 aria-expanded:bg-accent aria-expanded:text-accent-foreground dark:hover:bg-accent/50",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80 aria-expanded:bg-destructive/80 focus-visible:outline-destructive dark:bg-destructive/60",
        outline:
          "bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 aria-expanded:bg-accent aria-expanded:text-accent-foreground shadow-outline-1 shadow-xs dark:bg-input/30 dark:hover:bg-input/50",
        link: "text-primary underline-offset-4 hover:underline aria-expanded:underline",
      },
      size: {
        default:
          "h-10 px-5 text-base [--button-gap:8px] [--icon-inset:-4px] [&_svg:not([class*='size-'])]:size-4",
        xs: "h-7 px-3.5 text-xs [--button-gap:6px] [--icon-inset:-2px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 px-3.5 text-xs [--button-gap:6px] [--icon-inset:-2px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-14 px-6 text-xl [--button-gap:10px] [--icon-inset:-6px] [&_svg:not([class*='size-'])]:size-5",
        icon: "size-10 aspect-square p-0 [--button-gap:0px] [--icon-inset:0px] [&_svg:not([class*='size-'])]:size-5",
        "icon-xs":
          "size-7 aspect-square p-0 [--button-gap:0px] [--icon-inset:0px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-8 aspect-square p-0 [--button-gap:0px] [--icon-inset:0px] [&_svg:not([class*='size-'])]:size-4",
        "icon-lg":
          "size-12 aspect-square p-0 [--button-gap:0px] [--icon-inset:0px] [&_svg:not([class*='size-'])]:size-6",
      },
      shape: {
        pill: "rounded-full",
        square: "rounded-xl",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
      shape: "pill",
    },
  },
);

export type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({
  children,
  className,
  disabled,
  loading = false,
  shape = "pill",
  size = "default",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant, size, shape }), className)}
      data-loading={loading || undefined}
      data-shape={shape}
      data-size={size}
      data-variant={variant}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      {...props}
    >
      <span
        className={cn(
          "inline-flex min-w-0 items-center justify-center gap-1",
          loading && "invisible",
        )}
      >
        {wrapTextChildren(children)}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className="size-4" />
        </span>
      ) : null}
    </BaseButton>
  );
}

export type UnstyledButtonProps = React.ComponentProps<typeof BaseButton>;

export function UnstyledButton({ className, ...props }: UnstyledButtonProps) {
  return (
    <BaseButton
      className={cn(
        "cursor-pointer touch-manipulation select-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { buttonVariants, Spinner };
