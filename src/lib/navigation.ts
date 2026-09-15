export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  requiredPermission?: {
    modulo: string;
    recurso: string;
    acao: string;
    escopo: string;
  };
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Fase 1 do redesenho (docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md, seção
// C.2) — 24 itens flat viram 9 grupos. Nenhuma rota nova aqui: só reagrupa as
// 27 rotas que já existem em App.tsx. Páginas que ainda não existem
// (Avaliação de Outdoor, Usuários e Permissões) entram quando forem
// construídas em fases futuras, não como placeholder aqui.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [{ to: "/", label: "Dashboard", end: true }],
  },
  {
    label: "Operação",
    items: [{ to: "/pdvs", label: "PDVs" }],
  },
  {
    label: "Mídia Externa",
    items: [
      { to: "/outdoors", label: "Outdoors" },
      { to: "/manutencoes", label: "Manutenções" },
    ],
  },
  {
    label: "Merchandising",
    items: [
      { to: "/materiais", label: "Materiais" },
      { to: "/solicitacoes-material", label: "Solicitações de Material" },
      { to: "/avaliacoes-pdv", label: "Avaliação de PDV" },
      { to: "/planos-acao", label: "Planos de Ação" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/campanhas", label: "Campanhas" },
      { to: "/aprovacoes", label: "Aprovações" },
      { to: "/demandas-criativas", label: "Demandas Criativas" },
    ],
  },
  {
    label: "Estúdio",
    items: [
      { to: "/estudio", label: "Estúdio" },
      { to: "/estudio/templates", label: "Templates" },
      { to: "/estudio/elementos", label: "Elementos" },
      { to: "/estudio/historico", label: "Histórico de Peças" },
    ],
  },
  {
    label: "Marca",
    items: [{ to: "/biblioteca-marca", label: "Biblioteca de Marca" }],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/analise-estrategica/dashboard", label: "Dashboard" },
      { to: "/analise-estrategica/clusters/conveniencia", label: "Clusters — Conveniência" },
      { to: "/analise-estrategica/clusters/outdoors", label: "Clusters — Outdoor" },
      { to: "/analise-estrategica/clusters/comparativo", label: "Clusters — Comparativo" },
      { to: "/analise-estrategica/insights", label: "Insights" },
      { to: "/analise-estrategica/relatorios", label: "Relatórios" },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/checklist-config", label: "Config. Checklist" },
      {
        to: "/analise-estrategica/config",
        label: "Configuração da Análise",
        requiredPermission: { modulo: "analise", recurso: "config", acao: "editar", escopo: "rede_toda" },
      },
    ],
  },
];
