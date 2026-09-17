import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { NavGroup, NavItem } from "@/lib/navigation";

interface NavGroupListProps {
  groups: NavGroup[];
  onNavigate?: () => void;
}

function isItemActive(item: NavItem, pathname: string) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

export function NavGroupList({ groups, onNavigate }: NavGroupListProps) {
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups.map((group) => [group.label, group.items.some((item) => isItemActive(item, pathname))]),
    ),
  );

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((group) => (
        <Collapsible
          key={group.label}
          open={openGroups[group.label] ?? false}
          onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [group.label]: open }))}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60 hover:text-sidebar-foreground">
            {group.label}
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                openGroups[group.label] && "rotate-180",
              )}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="flex flex-col gap-1 pt-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex h-9 w-full items-center rounded-md px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
