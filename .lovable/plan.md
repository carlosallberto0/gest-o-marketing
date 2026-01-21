
# Plano de Implementacao: Modulo "Analise Estrategica"

## Visao Geral

Este plano descreve a criacao de um novo modulo independente chamado **"Analise Estrategica"** que:
- NAO modifica os modulos existentes (Midia Externa e Merchandising)
- Consome dados apenas em modo leitura dos modulos existentes
- Fornece insights estrategicos baseados em clusterizacao inteligente
- Segmenta analises entre PDVs de Conveniencia e Outdoors

---

## Fase 1: Estrutura de Banco de Dados (Migracao SQL)

### Novas Tabelas a Criar

```text
+----------------------------------+
|   analise_clusters_config        |
+----------------------------------+
| id, nome, tipo_pdv               |
| cor_hex, criterios_midia (JSON)  |
| criterios_merchandising (JSON)   |
| peso_midia, peso_merchandising   |
| ativo, created_at, updated_at    |
+----------------------------------+

+----------------------------------+
|   analise_clusters_calculo       |
+----------------------------------+
| id, pdv_id, pdv_tipo             |
| cluster_id (FK), pontuacao_total |
| pontuacao_midia, pontuacao_merch |
| pontuacao_detalhada (JSON)       |
| gap_midia_merch                  |
| potencial_aproveitamento         |
| data_calculo, created_at         |
+----------------------------------+

+----------------------------------+
|   analise_insights               |
+----------------------------------+
| id, titulo, descricao, tipo      |
| pdv_tipo, modulo_foco, dados     |
| acoes_recomendadas (JSON)        |
| impacto_estimado, data_geracao   |
+----------------------------------+

+----------------------------------+
|   analise_relatorios             |
+----------------------------------+
| id, nome, pdv_tipo               |
| parametros (JSON)                |
| agendamento_cron, ultima_geracao |
+----------------------------------+

+----------------------------------+
|   analise_config                 |
+----------------------------------+
| id, key, value (JSON)            |
| updated_at, updated_by           |
+----------------------------------+
```

### Politicas RLS
- Leitura: Super Admin e Director
- Escrita na config: Apenas Super Admin

---

## Fase 2: Estrutura de Arquivos

### Novos Arquivos a Criar

```text
src/pages/
  analise-estrategica/
    DashboardAnalise.tsx         # Dashboard principal
    ClustersConveniencia.tsx     # Clusters para PDVs de Conveniencia
    ClustersOutdoors.tsx         # Clusters para Outdoors
    ComparativoClusters.tsx      # Comparativo entre tipos
    InsightsConveniencia.tsx     # Insights especificos
    InsightsOutdoors.tsx         # Insights especificos
    InsightsCruzados.tsx         # Analise cruzada
    RelatoriosAnalise.tsx        # Relatorios estrategicos
    ConfigAnaliseEstrategica.tsx # Pagina de configuracao

src/hooks/
    useAnaliseEstrategica.ts     # Hook principal de dados
    useClusterizacao.ts          # Logica de clusterizacao
    useInsights.ts               # Geracao de insights
    useAnaliseConfig.ts          # Configuracoes do modulo

src/components/
  layout/
    AnaliseEstrategicaLayout.tsx # Layout do modulo

  analise/
    ClusterCard.tsx              # Card de cluster
    InsightCard.tsx              # Card de insight
    GapAnalysisChart.tsx         # Grafico de gap
    ClusterDistributionChart.tsx # Distribuicao de clusters
    ScoreComparisonChart.tsx     # Comparativo de scores
    ConfigTabs.tsx               # Abas de configuracao
```

---

## Fase 3: Hooks e Servicos

### useAnaliseEstrategica.ts
```text
Funcoes principais:
- useDadosCombinados() -> Busca dados de Midia + Merchandising
- useClustersByTipo(tipo) -> Clusters filtrados por tipo PDV
- useInsightsByTipo(tipo) -> Insights filtrados
- useGapAnalysis() -> PDVs com gaps significativos
- useEstatisticasAnalise() -> KPIs do modulo
```

### useClusterizacao.ts
```text
Funcoes:
- calcularScoreMidia(dadosMidia, criterios)
- calcularScoreMerchandising(dadosMerch, criterios)
- calcularClusterPDV(pdvData, tipo, config)
- classificarEmCluster(scoreTotal, clustersConfig)
```

### useAnaliseConfig.ts
```text
Funcoes:
- useAnaliseConfig() -> Busca configuracoes
- useUpdateAnaliseConfig() -> Atualiza configuracoes
- useClustersCriterios(tipo) -> Criterios por tipo
```

---

## Fase 4: Paginas e Componentes

### Dashboard Principal (/analise-estrategica/dashboard)

Layout com:
- KPIs resumidos (Total PDVs, Score Medio, Clusters Criticos)
- Grafico de distribuicao de clusters (Conveniencia vs Outdoors)
- Lista de insights recentes
- Acesso rapido aos relatorios

### Pagina de Clusters por Tipo

| Conveniencia | Outdoors |
|--------------|----------|
| Peso Merchandising: 60% | Peso Midia: 70% |
| Peso Midia: 40% | Peso Merchandising: 30% |
| Clusters: Premium Plus, Oportunidade Visivel, Necessita Merchandising, Critico | Clusters: Estrategico Total, Viario Prioritario, Parada Funcional, Necessita Atencao |

### Pagina de Insights

Tipos de insights:
- Tendencia: Padroes identificados
- Alerta: Situacoes que requerem atencao
- Oportunidade: Potencial de melhoria

### Pagina de Configuracao

Abas:
1. Geral (ativar/desativar, permissoes)
2. Conveniencia (pesos, criterios, clusters)
3. Outdoors (pesos, criterios, clusters)
4. Notificacoes (alertas, relatorios automaticos)
5. Integracao (timeouts, cache)

---

## Fase 5: Integracao com Sistema Existente

### Modificacoes em Arquivos Existentes

| Arquivo | Modificacao |
|---------|-------------|
| src/App.tsx | Adicionar rotas do modulo |
| src/pages/ModuleSelection.tsx | Adicionar card do novo modulo |
| src/contexts/ModuleContext.tsx | Adicionar tipo 'analise' |
| src/components/layout/ConfiguracoesLayout.tsx | Adicionar menu de config |

### Rotas a Adicionar

```text
/analise-estrategica/dashboard
/analise-estrategica/clusters/conveniencia
/analise-estrategica/clusters/outdoors
/analise-estrategica/clusters/comparativo
/analise-estrategica/insights/conveniencia
/analise-estrategica/insights/outdoors
/analise-estrategica/insights/cruzados
/analise-estrategica/relatorios
/configuracoes/analise-estrategica
```

### Permissoes

| Role | Acesso |
|------|--------|
| super_admin | Total |
| director | Visualizacao completa |
| gerente | Sem acesso |
| coordenador | Sem acesso |

---

## Fase 6: Logica de Clusterizacao

### Algoritmo de Calculo

```text
1. Buscar dados do PDV (Midia + Merchandising)
2. Calcular score de Midia (baseado em criterios)
3. Calcular score de Merchandising (baseado em criterios)
4. Aplicar pesos especificos por tipo de PDV
   - Conveniencia: 40% midia + 60% merchandising
   - Outdoor: 70% midia + 30% merchandising
5. Calcular score total ponderado
6. Calcular gap entre modulos
7. Classificar em cluster baseado na faixa de pontuacao
8. Gerar insights baseados nos dados
```

### Criterios por Tipo

**Conveniencia:**
- Midia: visibilidade (30%), localizacao (40%), conservacao (30%)
- Merchandising: share gondola (35%), posicionamento (30%), promocao (20%), organizacao (15%)

**Outdoors:**
- Midia: tamanho m2 (40%), fluxo veicular (35%), visibilidade distancia (25%)
- Merchandising: disponibilidade estoque (50%), acesso facil (30%), sinalizacao (20%)

---

## Fase 7: Ordem de Implementacao

### Semana 1 - Fundacao
1. Criar migracao SQL com todas as tabelas
2. Criar hooks base (useAnaliseConfig, useAnaliseEstrategica)
3. Criar AnaliseEstrategicaLayout
4. Criar pagina de configuracao basica

### Semana 2 - Core
1. Implementar logica de clusterizacao (useClusterizacao)
2. Criar DashboardAnalise com KPIs
3. Criar paginas de clusters (Conveniencia e Outdoors)
4. Criar componentes de visualizacao (ClusterCard, charts)

### Semana 3 - Insights
1. Implementar geracao de insights (useInsights)
2. Criar paginas de insights
3. Criar pagina comparativa
4. Criar pagina de relatorios

### Semana 4 - Integracao
1. Atualizar ModuleSelection.tsx
2. Atualizar App.tsx com rotas
3. Adicionar configuracao em ConfiguracoesLayout
4. Testes de integracao

---

## Secao Tecnica: Detalhes de Implementacao

### Estrutura de Tipos TypeScript

```typescript
interface ClusterConfig {
  id: string;
  nome: string;
  tipo_pdv: 'conveniencia' | 'outdoor';
  cor_hex: string;
  criterios_midia: Record<string, number>;
  criterios_merchandising: Record<string, number>;
  peso_midia: number;
  peso_merchandising: number;
  ativo: boolean;
}

interface ClusterCalculo {
  id: string;
  pdv_id: string;
  pdv_tipo: 'conveniencia' | 'outdoor';
  cluster_id: string;
  pontuacao_total: number;
  pontuacao_midia: number;
  pontuacao_merchandising: number;
  gap_midia_merch: number;
  potencial_aproveitamento: number;
}

interface Insight {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'tendencia' | 'alerta' | 'oportunidade';
  pdv_tipo: 'conveniencia' | 'outdoor' | 'ambos';
  modulo_foco: 'midia' | 'merchandising' | 'integrado';
  acoes_recomendadas: string[];
  impacto_estimado: number;
}
```

### Garantias de Seguranca

- Todas as queries aos modulos existentes sao SELECT apenas
- Nenhuma modificacao em tabelas de Midia Externa ou Merchandising
- Cache implementado para reduzir carga
- Timeout em consultas (30s padrao)
- Logs de todas as analises realizadas

---

## Resultado Esperado

Apos implementacao completa:

1. **Novo modulo** visivel na selecao de modulos (apenas Super Admin e Diretores)
2. **Dashboard estrategico** com visao combinada de Midia + Merchandising
3. **Analise segmentada** entre PDVs de Conveniencia e Outdoors
4. **Insights automaticos** baseados em gap analysis
5. **Configuracao flexivel** de criterios e pesos por tipo de PDV
6. **Relatorios estrategicos** para tomada de decisao

Os modulos Midia Externa e Merchandising continuam 100% funcionais sem nenhuma alteracao.
