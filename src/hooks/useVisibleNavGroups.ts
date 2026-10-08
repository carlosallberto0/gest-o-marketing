import { NAV_GROUPS, type NavGroup, type NavItem } from "@/lib/navigation";
import { useMinhasPermissoes } from "@/hooks/useMinhasPermissoes";

// Task 4 da Fase 1: filtra NAV_GROUPS pelas permissões do usuário logado.
// Item sem requiredPermission sempre aparece (comportamento padrão). Grupo
// que fica sem nenhum item após o filtro é removido, não renderiza vazio.
// Task A2: filtro também percorre `children` recursivamente — um item pai
// nunca some por causa dos filhos, só os filhos individualmente somem.
export function useVisibleNavGroups(): NavGroup[] {
  const { podeAcessar } = useMinhasPermissoes();

  function itemPermitido(item: { requiredPermission?: NavItem["requiredPermission"] }): boolean {
    return (
      !item.requiredPermission ||
      podeAcessar(
        item.requiredPermission.modulo,
        item.requiredPermission.recurso,
        item.requiredPermission.acao,
        item.requiredPermission.escopo,
      )
    );
  }

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(itemPermitido),
  })).filter((group) => group.items.length > 0);
}
