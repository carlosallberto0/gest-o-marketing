import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XOctagon,
  X,
} from "lucide-react";

const alertToastVariants = cva(
  "relative w-full max-w-sm overflow-hidden rounded-lg shadow-lg flex items-start p-4 space-x-4",
  {
    variants: {
      variant: {
        success: "",
        warning: "",
        info: "",
        error: "",
      },
      styleVariant: {
        default: "bg-background border",
        filled: "",
      },
    },
    compoundVariants: [
      {
        variant: "success",
        styleVariant: "default",
        className: "text-foreground border-success/30",
      },
      {
        variant: "warning",
        styleVariant: "default",
        className: "text-foreground border-warning/30",
      },
      {
        variant: "info",
        styleVariant: "default",
        className: "text-foreground border-info/30",
      },
      {
        variant: "error",
        styleVariant: "default",
        className: "text-foreground border-destructive/30",
      },
      {
        variant: "success",
        styleVariant: "filled",
        className: "bg-success text-success-foreground",
      },
      {
        variant: "warning",
        styleVariant: "filled",
        className: "bg-warning text-warning-foreground",
      },
      {
        variant: "info",
        styleVariant: "filled",
        className: "bg-info text-info-foreground",
      },
      {
        variant: "error",
        styleVariant: "filled",
        className: "bg-destructive text-destructive-foreground",
      },
    ],
    defaultVariants: {
      variant: "info",
      styleVariant: "default",
    },
  }
);

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XOctagon,
};

const iconColorClasses: Record<string, Record<string, string>> = {
  default: {
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    error: "text-destructive",
  },
  filled: {
    success: "text-success-foreground",
    warning: "text-warning-foreground",
    info: "text-info-foreground",
    error: "text-destructive-foreground",
  },
};

export interface AlertToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertToastVariants> {
  title: string;
  description: string;
  onClose: () => void;
  showCloseButton?: boolean;
  enableAnimations?: boolean;
}

const AlertToast = React.forwardRef<HTMLDivElement, AlertToastProps>(
  ({ 
    className, 
    variant = 'info', 
    styleVariant = 'default', 
    title, 
    description, 
    onClose, 
    showCloseButton = true,
    enableAnimations = true,
    ...props 
  }, ref) => {
    const Icon = iconMap[variant || 'info'];
    const iconColor = iconColorClasses[styleVariant || 'default'][variant || 'info'];

    const content = (
      <div
        ref={ref}
        className={cn(alertToastVariants({ variant, styleVariant, className }))}
        {...props}
      >
        <div className={cn("flex-shrink-0 mt-0.5", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm opacity-90 mt-0.5">{description}</p>
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );

    if (!enableAnimations) {
      return content;
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }
);

AlertToast.displayName = "AlertToast";

export { AlertToast, alertToastVariants };
