import { NAV_GROUPS, type NavGroup } from "@/lib/navigation";
import { useMinhasPermissoes } from "@/hooks/useMinhasPermissoes";

// Task 4 da Fase 1: filtra NAV_GROUPS pelas permissões do usuário logado.
// Item sem requiredPermission sempre aparece (comportamento padrão). Grupo
// que fica sem nenhum item após o filtro é removido, não renderiza vazio.
export function useVisibleNavGroups(): NavGroup[] {
  const { podeAcessar } = useMinhasPermissoes();

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !item.requiredPermission ||
        podeAcessar(
          item.requiredPermission.modulo,
          item.requiredPermission.recurso,
          item.requiredPermission.acao,
          item.requiredPermission.escopo,
        ),
    ),
  })).filter((group) => group.items.length > 0);
}
