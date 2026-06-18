import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-r from-amber-400 via-orange-400 to-yellow-500 text-stone-950 shadow-md shadow-amber-500/20 hover:from-amber-300 hover:via-orange-300 hover:to-yellow-400 hover:shadow-lg",
        outline:
          "border border-amber-400/30 bg-stone-950/70 text-amber-100 backdrop-blur-sm hover:border-amber-300/60 hover:bg-stone-900/90",
        ghost: "hover:bg-amber-400/10 hover:text-amber-100",
        secondary: "bg-amber-400/10 text-amber-100 hover:bg-amber-400/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
