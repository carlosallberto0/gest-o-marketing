import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleNavGroups } from "@/hooks/useVisibleNavGroups";
import { useMeuPerfil } from "@/hooks/useMeuPerfil";
import { NAV_FOOTER } from "@/lib/navigation";
import { NavGroupList, NavItemLink } from "@/components/layout/NavGroupList";
import { PAPEL_LABEL, iniciais } from "@/components/layout/AppHeader";

// Conteúdo único da sidebar escura: usado no desktop (AppSidebar) e dentro do
// Sheet no mobile (MobileNav).
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const groups = useVisibleNavGroups();
  const { data: perfil, isError: perfilComErro } = useMeuPerfil();
  const papel = !perfilComErro && perfil?.papel ? (PAPEL_LABEL[perfil.papel] ?? perfil.papel) : "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <span className="font-display text-[10px] font-extrabold tracking-tight">MOS</span>
        </div>
        <p className="font-display text-sm font-bold leading-none text-sidebar-accent-foreground">Marketing OS</p>
      </div>

      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <NavGroupList groups={groups} onNavigate={onNavigate} />
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-border p-3">
        <NavItemLink item={NAV_FOOTER} onNavigate={onNavigate} />
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-bold text-sidebar-icon-active"
            aria-hidden="true"
          >
            {perfilComErro ? "?" : iniciais(perfil?.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-xs font-semibold leading-tight ${perfilComErro ? "text-destructive-soft" : "text-sidebar-accent-foreground"}`}
            >
              {perfilComErro ? "Erro ao carregar perfil" : (perfil?.nome ?? "…")}
            </p>
            <p className="truncate text-[10px] text-sidebar-muted">{papel}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sair"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-icon-active"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:sticky md:top-0 md:block md:h-screen">
      <SidebarContent />
    </aside>
  );
}
