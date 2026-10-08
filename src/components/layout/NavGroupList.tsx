import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isNavItemActive, type NavGroup, type NavItem } from "@/lib/navigation";

interface NavItemLinkProps {
  item: NavItem;
  onNavigate?: () => void;
}

export function NavItemLink({ item, onNavigate }: NavItemLinkProps) {
  const { pathname } = useLocation();
  const active = isNavItemActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium leading-tight transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-icon-active",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-accent-foreground",
      )}
    >
      {Icon && (
        <Icon
          className={cn("h-4 w-4 shrink-0", active && "text-sidebar-icon-active")}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 flex-1">{item.label}</span>
    </Link>
  );
}

interface NavGroupListProps {
  groups: NavGroup[];
  onNavigate?: () => void;
}

export function NavGroupList({ groups, onNavigate }: NavGroupListProps) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavItemLink item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
