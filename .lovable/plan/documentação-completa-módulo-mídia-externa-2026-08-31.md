# Documentação Completa — Módulo Mídia Externa

Gerar um documento único em Markdown (português BR) descrevendo **tudo** que o módulo Mídia Externa faz hoje e tudo que ele entrega ao administrador. Documento de estado atual ("as-is"), sem propostas de melhoria e sem alterar código do sistema.

## Estrutura do documento

**1. Visão geral**
- Objetivo do módulo, usuários envolvidos (super admin, admin, diretor, gerente, fornecedor)
- Como o módulo se encaixa no sistema e o que ele compartilha com os demais módulos

**2. Mapa de telas e rotas**
- Cada rota do módulo, quem acessa, o que a tela faz e quais ações oferece
- Dashboard de mídia, outdoors, detalhe do outdoor, contratos, fornecedores, avaliações, manutenções, aprovações (admin/diretoria), ordens de serviço, painel do fornecedor, histórico/revisões, mapa estratégico, relatórios, controle de status

**3. Entidades e dados**
- Tabelas envolvidas (outdoors, contracts, contract_images, contract_outdoors, media_evaluations, media_evaluation_photos, maintenance_requests, maintenance_approval_packages, maintenance_package_items, supplier_work_orders e itens, service_orders e itens, suppliers, supplier_pricing, supplier_deadline_history, routes, route_points, route_history, outdoor_monthly_reviews, outdoor_geolocation_history, observacoes_diretoria_outdoor, alerts)
- Campos-chave, relacionamentos e enums de status

**4. Fluxos de negócio ponta a ponta**
- Ciclo de avaliação mensal de outdoors (periodicidade, validade, reset de ciclo, notificações aos gerentes)
- Fluxo de manutenção completo: avaliação → solicitação → pacote de aprovação → aprovação diretoria → atribuição a fornecedor → execução → validação (incluindo reversão e correção)
- Caminho direto vs. escalado, justificativa obrigatória em rejeições
- Ordens de serviço e ciclo de status
- Contratos: vigência, alertas de vencimento, imagens e vínculo N:N com outdoors
- Roteirização: rota automática, manual, unificada, recalibração de coordenadas

**5. O que o administrador recebe**
- KPIs e dashboards, progresso de avaliações por posto, indicadores de manutenção e custos
- Relatórios e PDFs gerados (ordem de serviço, manutenção aprovada, comparativo de fotos)
- Exportações, alertas e notificações automáticas
- Controles administrativos exclusivos (override de fluxo, edição em massa, status em massa, inserção de dados de teste, calibração de coordenadas)

**6. Permissões e segurança**
- Matriz de papel × ação
- RLS, feature flags, menus configuráveis de gerente e diretor, acesso do fornecedor via `supplier_id`

**7. Automação e backend**
- Edge functions usadas pelo módulo e o que cada uma faz
- Funções e RPCs do banco relevantes
- Regras de notificação e auditoria

**8. Anexos**
- Glossário, índice de rotas, índice de tabelas, índice de hooks/componentes principais
- Notas para o desenvolvedor: fonte da verdade, convenções obrigatórias, pontos sensíveis

## Método

Levantamento direto no código e no banco: rotas em `App.tsx`, páginas e componentes de Mídia Externa, hooks de dados, edge functions, esquema das tabelas, políticas RLS e funções do banco. Nada será afirmado sem verificação prévia.

## Entrega

Arquivo `Modulo-Midia-Externa.md` em `/mnt/documents`, disponível para download. Nenhum arquivo do projeto será modificado.
