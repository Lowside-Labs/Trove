import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const inputVariants = cva(
  [
    "w-full min-w-0 rounded-lg border border-input bg-secondary px-4 text-foreground outline-none transition",
    "placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        default: "h-10 text-[14px]",
        lg: "h-11 text-[15px]",
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
