# ADR-007 — Escopo do MVP e ordem de fases do Marketing OS novo

> Registro de decisões arquiteturais e de produto — 2026-09-08.

**Status:** aceito

**Contexto.** `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md` levantou 8 decisões pendentes antes de iniciar a construção. Este ADR fecha as três relativas a escopo e ordem; ADR-005 e ADR-006 fecham as demais relativas a repositório/isolamento e modelo de permissão.

**Decisões:**

1. **Loteamentos:** o congelamento decidido pelo usuário em 2026-09-03 ([[modulo-loteamentos-congelado]] na memória do projeto) **continua valendo**. O módulo fica fora do roadmap do sistema novo até nova autorização explícita — a reconstrução do zero não reabre essa decisão por conta própria.
2. **Financeiro** (custos externos, rateio) **e Agência** (demandas/fotos/vídeos): ficam **fora do escopo inicial** do sistema novo, mantendo a mesma delimitação que o `PRD-Gestao-Marketing.md` já adotava para o sistema antigo. Reavaliar só sob pedido explícito do usuário.
3. **Ordem de construção confirmada** (sem alteração da proposta técnica original): Core (auth/permissão/PDV/auditoria) → Mídia Externa → Merchandising → Aprovações Executivas → Central Criativa + Biblioteca de Marca → Estúdio de Comunicação → Análise Estratégica → Homologação/produção.

**Consequência.** MVP mais enxuto, com escopo alinhado ao que já era a delimitação formal do sistema antigo. Qualquer expansão desses três itens (Loteamentos, Financeiro, Agência) para dentro do roadmap exige nova decisão explícita do usuário, não presunção da equipe de construção.
