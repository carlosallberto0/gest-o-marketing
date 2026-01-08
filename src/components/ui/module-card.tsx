import * as React from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModuleCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  buttonColor?: string;
  onClick: () => void;
  className?: string;
}

const cardAnimation: Variants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.3 },
  },
};

const arrowAnimation: Variants = {
  hover: {
    x: 5,
    transition: { duration: 0.3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
  }
};

const ModuleCard = React.forwardRef<HTMLDivElement, ModuleCardProps>(
  ({ className, title, description, icon: Icon, iconBgColor = "#3b82f6", buttonColor = "#3b82f6", onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative flex flex-col w-full p-6 overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm transition-shadow duration-300 ease-in-out group hover:shadow-lg cursor-pointer border border-border/50",
          className
        )}
        variants={cardAnimation}
        whileHover="hover"
        onClick={onClick}
      >
        {/* Icon Container */}
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-md"
          style={{ backgroundColor: iconBgColor }}
        >
          {Icon && <Icon className="w-7 h-7 text-white" />}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {description}
          </p>

          {/* Link */}
          <div 
            className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase"
            style={{ color: buttonColor }}
          >
            <span>Acessar</span>
            <motion.span variants={arrowAnimation}>
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </div>
        </div>
      </motion.div>
    );
  }
);

ModuleCard.displayName = "ModuleCard";

export { ModuleCard };
