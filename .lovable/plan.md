
# Plano: Continuar Implementacao do Modulo Analise Estrategica

## Resumo do Estado Atual

### Ja Criado (Fundacao Tecnica)
- 5 tabelas no banco de dados com RLS (analise_clusters_config, analise_clusters_calculo, analise_insights, analise_relatorios, analise_config)
- Tipos TypeScript (src/types/analise-estrategica.ts)
- 4 Hooks (useAnaliseConfig, useAnaliseEstrategica, useClusterizacao, useInsightsGeneration)
- Layout do modulo (AnaliseEstrategicaLayout.tsx) com sidebar completa
- 5 Componentes base (ClusterCard, InsightCard, ClusterDistributionChart, GapAnalysisChart, ScoreComparisonChart)

### Pendente (Este Plano)
- 7 Paginas do modulo
- Integracao com App.tsx (rotas)
- Integracao com ModuleSelection.tsx (card do modulo)
- Integracao com ModuleContext.tsx (tipo 'analise')

---

## Fase 1: Criar Paginas do Modulo

### 1.1 DashboardAnalise.tsx
Caminho: src/pages/analise-estrategica/DashboardAnalise.tsx

Conteudo:
- KPIs principais (Total PDVs, Score Medio, Clusters Criticos, Insights Nao Lidos)
- Grafico de distribuicao de clusters (conveniencia vs outdoors lado a lado)
- Lista de insights recentes (ultimos 5)
- Botao para recalcular clusters
- Cards de acesso rapido para relatorios

Componentes usados: ClusterDistributionChart, InsightCard, ScoreCard

### 1.2 ClustersConveniencia.tsx
Caminho: src/pages/analise-estrategica/ClustersConveniencia.tsx

Conteudo:
- Header com titulo e botao recalcular
- Grid de ClusterCards mostrando distribuicao
- Tabela de PDVs classificados com:
  - Nome do PDV
  - Cluster (badge colorido)
  - Score Total
  - Score Midia
  - Score Merchandising
  - Gap
- Filtros por cluster

### 1.3 ClustersOutdoors.tsx
Caminho: src/pages/analise-estrategica/ClustersOutdoors.tsx

Similar ao ClustersConveniencia mas filtrado para tipo 'outdoor'

### 1.4 ComparativoClusters.tsx
Caminho: src/pages/analise-estrategica/ComparativoClusters.tsx

Conteudo:
- Comparativo lado a lado entre Conveniencia e Outdoors
- ScoreComparisonChart mostrando medias
- GapAnalysisChart destacando PDVs com maiores gaps
- Tabela resumo com top 10 gaps

### 1.5 InsightsPage.tsx
Caminho: src/pages/analise-estrategica/InsightsPage.tsx

Conteudo:
- Filtros por tipo (Tendencia, Alerta, Oportunidade)
- Filtros por modulo foco (Midia, Merchandising, Integrado)
- Grid de InsightCards
- Botao para gerar novos insights
- Marcar como lido individual/em massa

### 1.6 RelatoriosAnalise.tsx
Caminho: src/pages/analise-estrategica/RelatoriosAnalise.tsx

Conteudo:
- Lista de relatorios salvos
- Botao para criar novo relatorio
- Filtros por tipo PDV
- Download em PDF/Excel
- Agendamento de relatorios automaticos

### 1.7 ConfigAnaliseEstrategica.tsx
Caminho: src/pages/analise-estrategica/ConfigAnaliseEstrategica.tsx

Conteudo:
- Tabs: Geral, Conveniencia, Outdoors
- Tab Geral: ativar/desativar modulo, permissoes
- Tab Conveniencia: configurar pesos (40% midia / 60% merch), criterios, faixas de clusters
- Tab Outdoors: configurar pesos (70% midia / 30% merch), criterios, faixas de clusters
- Preview das faixas de pontuacao

---

## Fase 2: Integracao com ModuleContext

### Modificar src/contexts/ModuleContext.tsx

Adicionar 'analise' ao tipo ActiveModule:
```
type ActiveModule = 'media' | 'merchandising' | 'mapa' | 'financeiro' | 'configuracoes' | 'agencia' | 'loteamentos' | 'analise' | null;
```

---

## Fase 3: Integracao com ModuleSelection

### Modificar src/pages/ModuleSelection.tsx

1. Adicionar icone ao moduleIcons:
```
import { TrendingUp } from 'lucide-react';

const moduleIcons = {
  // ... existentes
  analise: TrendingUp,
};
```

2. Adicionar path ao modulePaths:
```
const modulePaths = {
  // ... existentes
  analise: '/analise-estrategica/dashboard',
};
```

3. Adicionar 'analise' ao moduleKeys:
```
const moduleKeys = ['merchandising', 'media', 'mapa', 'financeiro', 'configuracoes', 'agencia', 'loteamentos', 'analise'] as const;
```

4. Atualizar filtro de modulos disponiveis:
```
// Na funcao availableModules, adicionar:
if (moduleId === 'analise') {
  return ['super_admin', 'director'].includes(profile?.role || '');
}
```

5. Atualizar handleModuleSelect para incluir 'analise':
```
setActiveModule(moduleId as 'media' | 'merchandising' | 'mapa' | 'financeiro' | 'configuracoes' | 'agencia' | 'loteamentos' | 'analise');
```

---

## Fase 4: Integracao com App.tsx

### Adicionar imports
```
import { AnaliseEstrategicaLayout } from './components/layout/AnaliseEstrategicaLayout';
import DashboardAnalise from './pages/analise-estrategica/DashboardAnalise';
import ClustersConveniencia from './pages/analise-estrategica/ClustersConveniencia';
import ClustersOutdoors from './pages/analise-estrategica/ClustersOutdoors';
import ComparativoClusters from './pages/analise-estrategica/ComparativoClusters';
import InsightsPage from './pages/analise-estrategica/InsightsPage';
import RelatoriosAnalise from './pages/analise-estrategica/RelatoriosAnalise';
import ConfigAnaliseEstrategica from './pages/analise-estrategica/ConfigAnaliseEstrategica';
```

### Adicionar rotas (seguindo padrao dos outros modulos)
```
{/* Análise Estratégica Module Routes */}
<Route 
  path="/analise-estrategica"
  element={
    <ProtectedRoute>
      <RequireRole allowedRoles={['super_admin', 'director']}>
        <AnaliseEstrategicaLayout>
          <Outlet />
        </AnaliseEstrategicaLayout>
      </RequireRole>
    </ProtectedRoute>
  }
>
  <Route path="dashboard" element={<DashboardAnalise />} />
  <Route path="clusters/conveniencia" element={<ClustersConveniencia />} />
  <Route path="clusters/outdoors" element={<ClustersOutdoors />} />
  <Route path="clusters/comparativo" element={<ComparativoClusters />} />
  <Route path="insights" element={<InsightsPage />} />
  <Route path="relatorios" element={<RelatoriosAnalise />} />
  <Route 
    path="config" 
    element={
      <RequireRole allowedRoles={['super_admin']}>
        <ConfigAnaliseEstrategica />
      </RequireRole>
    } 
  />
</Route>
```

---

## Fase 5: Configuracoes Padrao do Modulo

### Adicionar configuracao ao useModuleSettings

Criar registro padrao para o modulo 'analise' no banco ou no hook:
- title: 'Analise Estrategica'
- description: 'Insights e clusterizacao de PDVs'
- icon_color: '#10b981' (emerald-500)
- button_color: '#10b981'

---

## Estrutura Final de Arquivos

```
src/pages/analise-estrategica/
  DashboardAnalise.tsx         # Dashboard com KPIs e visao geral
  ClustersConveniencia.tsx     # Clusters de PDVs de conveniencia
  ClustersOutdoors.tsx         # Clusters de outdoors
  ComparativoClusters.tsx      # Comparativo entre tipos
  InsightsPage.tsx             # Listagem e gestao de insights
  RelatoriosAnalise.tsx        # Relatorios estrategicos
  ConfigAnaliseEstrategica.tsx # Configuracao de pesos e criterios
```

---

## Permissoes de Acesso

| Pagina | super_admin | director |
|--------|-------------|----------|
| Dashboard | Sim | Sim |
| Clusters Conveniencia | Sim | Sim |
| Clusters Outdoors | Sim | Sim |
| Comparativo | Sim | Sim |
| Insights | Sim | Sim |
| Relatorios | Sim | Sim |
| Configuracoes | Sim | Nao |

---

## Ordem de Implementacao

1. Criar DashboardAnalise.tsx (pagina principal)
2. Criar ClustersConveniencia.tsx e ClustersOutdoors.tsx
3. Criar ComparativoClusters.tsx
4. Criar InsightsPage.tsx
5. Criar RelatoriosAnalise.tsx
6. Criar ConfigAnaliseEstrategica.tsx
7. Atualizar ModuleContext.tsx (adicionar 'analise')
8. Atualizar ModuleSelection.tsx (adicionar card e filtro)
9. Atualizar App.tsx (adicionar rotas)

---

## Resultado Esperado

Apos implementacao:
1. Card "Analise Estrategica" visivel na pagina de selecao de modulos (apenas Super Admin e Diretores)
2. Sidebar propria com navegacao entre as paginas
3. Dashboard com visao geral de KPIs e clusters
4. Analise segmentada entre Conveniencia e Outdoors
5. Insights automaticos baseados em gap analysis
6. Configuracao flexivel de pesos e criterios (apenas Super Admin)
