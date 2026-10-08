import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SECTIONS } from "@/lib/navigation";
import { useMinhasPermissoes } from "@/hooks/useMinhasPermissoes";

// Barra de abas (links) da seção a que a rota atual pertence. Não renderiza
// nada fora de uma seção, nem quando sobra uma única aba (sem permissão).
export function SectionTabs() {
  const { pathname } = useLocation();
  const { podeAcessar } = useMinhasPermissoes();
  const section = SECTIONS.find((s) => s.tabs.some((t) => t.to === pathname));
  if (!section) return null;

  const tabs = section.tabs.filter(
    (t) =>
      !t.requiredPermission ||
      podeAcessar(
        t.requiredPermission.modulo,
        t.requiredPermission.recurso,
        t.requiredPermission.acao,
        t.requiredPermission.escopo,
      ),
  );
  if (tabs.length < 2) return null;

  return (
    <nav aria-label="Seções" className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            cn(
              "shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors",
              isActive
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
