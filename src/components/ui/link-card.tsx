import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface LinkCardProps {
  title: string;
  description: string;
  imageUrl?: string | null;
  icon?: LucideIcon;
  iconBgColor?: string;
  buttonColor?: string;
  buttonText?: string;
  features?: string[];
  onClick: () => void;
  className?: string;
}

const cardVariants = {
  initial: { scale: 1, y: 0 },
  hover: {
    scale: 1.03,
    y: -5,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 15,
    },
  },
};

const LinkCard = React.forwardRef<HTMLDivElement, LinkCardProps>(
  (
    {
      className,
      title,
      description,
      imageUrl,
      icon: Icon,
      iconBgColor = "hsl(var(--primary))",
      buttonColor,
      buttonText = "Acessar Módulo",
      features = [],
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg transition-shadow hover:shadow-xl",
          className
        )}
        variants={cardVariants}
        initial="initial"
        whileHover="hover"
        onClick={onClick}
        {...props}
      >
        {/* Image or Icon area */}
        <div className="relative h-40 w-full overflow-hidden bg-muted/30">
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          ) : Icon ? (
            <div className="flex h-full w-full items-center justify-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: iconBgColor }}
              >
                <Icon className="h-10 w-10 text-white" />
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-4xl font-bold text-muted-foreground/30">
                {title.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {/* Features */}
          {features.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Funcionalidades
              </p>
              <ul className="grid grid-cols-1 gap-0.5">
                {features.slice(0, 4).map((feature, index) => (
                  <li
                    key={index}
                    className="text-xs text-foreground/80 flex items-center gap-1.5"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: buttonColor || iconBgColor }}
                    />
                    <span className="truncate">{feature}</span>
                  </li>
                ))}
                {features.length > 4 && (
                  <li className="text-xs text-muted-foreground">
                    +{features.length - 4} mais
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Button */}
          <div className="mt-auto pt-4">
            <Button
              className="w-full transition-all"
              style={{
                backgroundColor: buttonColor || iconBgColor,
                borderColor: buttonColor || iconBgColor,
              }}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
);

LinkCard.displayName = "LinkCard";

export { LinkCard };
export type { LinkCardProps };
