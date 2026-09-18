import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  titulo: string;
  valor: string;
  detalhe?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "info" | "indigo" | "orange" | "gray";
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  indigo: "bg-category-indigo/10 text-category-indigo",
  orange: "bg-category-orange/10 text-category-orange",
  gray: "bg-muted text-muted-foreground",
};

export function KpiCard({ titulo, valor, detalhe, icon: Icon, accent = "primary" }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", ACCENT_CLASSES[accent])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}
