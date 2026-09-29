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

function isItemActive(item: NavItem, pathname: string): boolean {
  const ownMatch = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
  return ownMatch || (item.children?.some((child) => isItemActive(child, pathname)) ?? false);
}

export function NavGroupList({ groups, onNavigate }: NavGroupListProps) {
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups.map((group) => [group.label, group.items.some((item) => isItemActive(item, pathname))]),
    ),
  );
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((group) => (
        <Collapsible
          key={group.label}
          open={openGroups[group.label] ?? false}
          onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [group.label]: open }))}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/80 hover:text-sidebar-foreground">
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
                  {item.children ? (
                    <Collapsible
                      open={openItems[item.to] ?? item.children.some((child) => isItemActive(child, pathname))}
                      onOpenChange={(open) => setOpenItems((prev) => ({ ...prev, [item.to]: open }))}
                    >
                      <div className="flex items-center gap-1">
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
                        <CollapsibleTrigger
                          className="rounded-md p-1 hover:bg-sidebar-accent"
                          aria-label={`Expandir ${item.label}`}
                        >
                          <ChevronDown
                            className={cn("h-3.5 w-3.5 transition-transform", openItems[item.to] && "rotate-180")}
                            aria-hidden="true"
                          />
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <ul className="flex flex-col gap-1 py-1 pl-4">
                          {item.children.map((child) => (
                            <li key={child.to}>
                              <NavLink
                                to={child.to}
                                end={child.end}
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
                                {child.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
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
                  )}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
