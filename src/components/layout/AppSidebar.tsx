import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleNavGroups } from "@/hooks/useVisibleNavGroups";
import { NavGroupList } from "@/components/layout/NavGroupList";

export function AppSidebar() {
  const { signOut } = useAuth();
  const groups = useVisibleNavGroups();

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex md:w-56 md:sticky md:top-0 md:h-screen"
    >
      <p className="text-lg font-semibold">Marketing OS</p>
      <NavGroupList groups={groups} />
      <Button variant="outline" size="sm" onClick={signOut}>
        Sair
      </Button>
    </nav>
  );
}
