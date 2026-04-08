import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/cn";

const inputVariants = cva(
  [
    "w-full min-w-0 text-foreground outline-none transition",
    "placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-input bg-secondary px-4 focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20",
        editorial:
          "border-0 bg-transparent px-0 shadow-none focus:ring-0 focus:border-transparent",
      },
      size: {
        default: "h-10 text-[14px]",
        lg: "h-11 text-[15px]",
        xl: "h-14 text-[28px] font-medium",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

export type InputProps = Omit<React.ComponentProps<typeof BaseInput>, "size"> &
  VariantProps<typeof inputVariants>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, variant, ...props },
  ref,
) {
  return (
    <BaseInput
      ref={ref}
      className={cn(inputVariants({ size, variant }), className)}
      {...props}
    />
  );
});
