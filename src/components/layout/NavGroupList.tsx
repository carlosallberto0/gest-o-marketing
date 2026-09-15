import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { NavGroup } from "@/lib/navigation";

interface NavGroupListProps {
  groups: NavGroup[];
  onNavigate?: () => void;
}

export function NavGroupList({ groups, onNavigate }: NavGroupListProps) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
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
        </div>
      ))}
    </div>
  );
}
