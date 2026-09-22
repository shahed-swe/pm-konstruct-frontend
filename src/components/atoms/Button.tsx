"use client";

/**
 * The button.
 *
 * Ported from the current app's `components/ui/button.tsx`, including its
 * departures from stock shadcn -- the tint-on-hover instead of a colour
 * change, the border on filled variants, the `min-h` sizes. Those were
 * deliberate there and changing them would be visible on every screen.
 *
 * React 19 takes `ref` as an ordinary prop, so there is no `forwardRef` here.
 */
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border border-destructive-border",
        // Takes the background of whatever card, sidebar or banner it sits
        // in, which is why the border is a translucent overlay rather than a
        // border colour.
        outline: "border [border-color:var(--button-outline)] shadow-xs active:shadow-none",
        secondary: "border bg-secondary text-secondary-foreground border-secondary-border",
        // The transparent border keeps a ghost button the same size as the
        // others, so a row of mixed variants does not jump.
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // `min-h` rather than `h`: a button with a two-line label on a phone
        // grows instead of clipping.
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a `<button>` -- a link styled as one. */
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
