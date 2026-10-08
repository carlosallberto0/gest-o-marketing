import {
  BookImage,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  History,
  Layers,
  LayoutGrid,
  LineChart,
  ListTodo,
  type LucideIcon,
  MapPin,
  Megaphone,
  Package,
  Palette,
  Settings,
  Shapes,
  Signpost,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";

export interface NavPermission {
  modulo: string;
  recurso: string;
  acao: string;
  escopo: string;
}

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  icon?: LucideIcon;
  // Subtítulo curto exibido no AppHeader.
  description?: string;
  // Quando a rota ativa não é só `to`/`to/*` (ex.: item que cobre várias rotas).
  isActive?: (pathname: string) => boolean;
  requiredPermission?: NavPermission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ANALISE_CONFIG = "/analise-estrategica/config";

const PERMISSAO_CONFIG_ANALISE: NavPermission = {
  modulo: "analise",
  recurso: "config",
  acao: "editar",
  escopo: "rede_toda",
};

// Nenhuma rota nova aqui: só reagrupa as rotas que já existem em App.tsx.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { to: "/", label: "Dashboard", end: true, icon: LayoutGrid, description: "Visão geral operacional" },
      { to: "/campanhas", label: "Campanhas", icon: Megaphone, description: "Gestão de campanhas" },
    ],
  },
  {
    label: "Produção",
    items: [
      { to: "/estudio", label: "Estúdio", end: true, icon: Sparkles, description: "Criação de peças" },
      { to: "/estudio/templates", label: "Templates", icon: Layers, description: "Biblioteca de templates" },
      { to: "/estudio/elementos", label: "Biblioteca de Elementos", icon: Shapes, description: "Elementos visuais" },
      { to: "/estudio/historico", label: "Histórico de Peças", icon: History, description: "Peças já criadas" },
    ],
  },
  {
    label: "Aprovação",
    items: [
      { to: "/aprovacoes", label: "Aprovações", icon: CheckCircle2, description: "Fluxo de aprovação" },
      { to: "/demandas-criativas", label: "Central Criativa", icon: Palette, description: "Demandas e produção" },
    ],
  },
  {
    label: "Ativos e PDV",
    items: [
      { to: "/pdvs", label: "PDVs", icon: Store, description: "Pontos de venda" },
      { to: "/outdoors", label: "Outdoors", icon: Signpost, description: "Gestão de ativos físicos" },
      { to: "/manutencoes", label: "Manutenções", icon: Wrench, description: "Manutenção de mídia externa" },
      { to: "/materiais", label: "Materiais", icon: Package, description: "Materiais de merchandising" },
      {
        to: "/solicitacoes-material",
        label: "Solicitações de Material",
        icon: ClipboardList,
        description: "Pedidos de material dos PDVs",
      },
      { to: "/avaliacoes-pdv", label: "Avaliação de PDV", icon: ClipboardCheck, description: "Checklist de visita" },
      { to: "/planos-acao", label: "Planos de Ação", icon: ListTodo, description: "Correções e prazos" },
      { to: "/biblioteca-marca", label: "Biblioteca de Marca", icon: BookImage, description: "Identidade visual" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      {
        to: "/analise-estrategica/dashboard",
        label: "Análise Estratégica",
        icon: LineChart,
        description: "Clusters, insights e relatórios",
        // Config da análise pertence ao item Configurações do rodapé.
        isActive: (p) => p.startsWith("/analise-estrategica") && p !== ANALISE_CONFIG,
      },
    ],
  },
];

// Fora dos grupos, no rodapé da sidebar. Leva à Config. Checklist e fica ativo
// também na Configuração da Análise (alcançável pelas abas — ver SECTIONS).
export const NAV_FOOTER: NavItem = {
  to: "/checklist-config",
  label: "Configurações",
  icon: Settings,
  description: "Checklist e análise",
  isActive: (p) => p === "/checklist-config" || p === ANALISE_CONFIG,
};

export interface SectionTab {
  to: string;
  label: string;
  requiredPermission?: NavPermission;
}

// Barras de abas (SectionTabs). A ordem importa: a primeira seção que contém a
// rota atual vence, então a Configuração da Análise mostra as abas de
// Configurações, não as de Análise.
export const SECTIONS: { id: string; tabs: SectionTab[] }[] = [
  {
    id: "configuracoes",
    tabs: [
      { to: "/checklist-config", label: "Config. Checklist" },
      { to: ANALISE_CONFIG, label: "Configuração da Análise", requiredPermission: PERMISSAO_CONFIG_ANALISE },
    ],
  },
  {
    id: "analise",
    tabs: [
      { to: "/analise-estrategica/dashboard", label: "Dashboard" },
      { to: "/analise-estrategica/clusters/conveniencia", label: "Clusters — Conveniência" },
      { to: "/analise-estrategica/clusters/outdoors", label: "Clusters — Outdoor" },
      { to: "/analise-estrategica/clusters/comparativo", label: "Clusters — Comparativo" },
      { to: "/analise-estrategica/insights", label: "Insights" },
      { to: "/analise-estrategica/relatorios", label: "Relatórios" },
    ],
  },
];

// Todas as páginas navegáveis (menu + abas), para a busca global.
export const ALL_PAGES: { to: string; label: string }[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  NAV_FOOTER,
  ...SECTIONS.flatMap((s) => s.tabs),
].filter((item, i, arr) => arr.findIndex((o) => o.to === item.to) === i);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.isActive) return item.isActive(pathname);
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
}

// Título e subtítulo do AppHeader. Aba exata vence o item de menu (ex.:
// "Insights" em vez de "Análise Estratégica").
export function getPageInfo(pathname: string): { title: string; description?: string } {
  const items = [...NAV_GROUPS.flatMap((g) => g.items), NAV_FOOTER];
  const item = items.find((i) => isNavItemActive(i, pathname));
  const tab = SECTIONS.flatMap((s) => s.tabs).find((t) => t.to === pathname);
  if (tab) return { title: tab.label, description: item?.description };
  return item ? { title: item.label, description: item.description } : { title: "Marketing OS" };
}
