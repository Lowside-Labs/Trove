import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const inputVariants = cva(
  [
    "w-full min-w-0 rounded-full border border-black/10 bg-white/78 px-5 text-zinc-950 shadow-sm outline-none transition",
    "placeholder:text-zinc-500 focus-visible:border-black/20 focus-visible:ring-2 focus-visible:ring-black/10",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        default: "h-12 text-sm",
        lg: "h-14 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type InputProps = Omit<React.ComponentProps<typeof BaseInput>, "size"> &
  VariantProps<typeof inputVariants>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, ...props },
  ref,
) {
  return <BaseInput ref={ref} className={cn(inputVariants({ size }), className)} {...props} />;
});
