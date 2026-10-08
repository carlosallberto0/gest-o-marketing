import { ALL_PAGES } from "@/lib/navigation";
import { usePdvs } from "@/hooks/usePdvs";
import { useCampanhas } from "@/hooks/useCampanhas";

export interface BuscaGlobalResultado {
  to: string;
  label: string;
}

export interface BuscaGlobalGrupo {
  label: string;
  itens: BuscaGlobalResultado[];
}

// ponytail: busca client-side sobre dado já cacheado (nav + PDVs + Campanhas),
// não é busca full-text cross-tabela. Upgrade: RPC de busca agregada no banco
// se o catálogo de entidades buscáveis crescer (materiais, outdoors,
// fornecedores, documentos, peças do Estúdio — TODO explícito, ver spec seção
// "Decisões em aberto — 2"). Resultado de PDV/Campanha leva à LISTA
// correspondente, não abre direto o registro (sem mecanismo de deep-link
// hoje nessas páginas).
//
// `ativo`: repassado pelo chamador (ex.: `buscaAberta` do CommandDialog em
// AppHeader) para evitar buscar com o diálogo fechado — vira `enabled` nas
// duas queries internas (usePdvs/useCampanhas passaram a aceitar
// `options?.enabled`), então elas nem disparam contra o banco enquanto o
// diálogo está fechado.
export function useBuscaGlobal(termo: string, ativo: boolean): BuscaGlobalGrupo[] {
  const { data: pdvs } = usePdvs({ enabled: ativo });
  const { data: campanhas } = useCampanhas(undefined, { enabled: ativo });
  if (!ativo) return [];
  const termoLower = termo.trim().toLowerCase();
  if (!termoLower) return [];

  const paginas = ALL_PAGES.filter((item) => item.label.toLowerCase().includes(termoLower));

  const pdvsFiltrados = (pdvs ?? [])
    .filter((pdv) => pdv.nome.toLowerCase().includes(termoLower) || pdv.codigo.toLowerCase().includes(termoLower))
    .slice(0, 5)
    .map((pdv) => ({ to: "/pdvs", label: `${pdv.codigo} — ${pdv.nome}` }));

  const campanhasFiltradas = (campanhas ?? [])
    .filter((campanha) => campanha.nome.toLowerCase().includes(termoLower))
    .slice(0, 5)
    .map((campanha) => ({ to: "/campanhas", label: campanha.nome }));

  const grupos: BuscaGlobalGrupo[] = [];
  if (paginas.length) grupos.push({ label: "Páginas", itens: paginas });
  if (pdvsFiltrados.length) grupos.push({ label: "PDVs", itens: pdvsFiltrados });
  if (campanhasFiltradas.length) grupos.push({ label: "Campanhas", itens: campanhasFiltradas });
  return grupos;
}
