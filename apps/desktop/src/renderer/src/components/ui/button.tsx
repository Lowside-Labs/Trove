import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition duration-200",
    "cursor-pointer select-none touch-manipulation disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40",
  ],
  {
    variants: {
      variant: {
        primary: "bg-zinc-950 text-white hover:bg-zinc-800",
        secondary: "bg-white/75 text-zinc-900 ring-1 ring-black/8 hover:bg-white",
        ghost: "bg-transparent text-zinc-700 hover:bg-black/5 hover:text-zinc-950",
        chip: "bg-white/70 text-zinc-700 ring-1 ring-black/8 hover:bg-white data-[active=true]:bg-zinc-950 data-[active=true]:text-white",
      },
      size: {
        default: "h-11 px-5 text-sm font-medium",
        sm: "h-9 px-4 text-sm font-medium",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return (
    <BaseButton className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
