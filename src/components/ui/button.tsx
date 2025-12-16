import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 rounded",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 rounded",
        info: "bg-info text-info-foreground hover:bg-info/90 rounded",
        "outline-primary": "border border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground rounded",
        "outline-success": "border border-success text-success bg-transparent hover:bg-success hover:text-success-foreground rounded",
        "outline-danger": "border border-destructive text-destructive bg-transparent hover:bg-destructive hover:text-destructive-foreground rounded",
        "soft-primary": "bg-primary/10 text-primary hover:bg-primary/20 rounded",
        "soft-success": "bg-success/10 text-success hover:bg-success/20 rounded",
        "soft-warning": "bg-warning/10 text-warning hover:bg-warning/20 rounded",
        "soft-danger": "bg-destructive/10 text-destructive hover:bg-destructive/20 rounded",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-11 rounded px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
