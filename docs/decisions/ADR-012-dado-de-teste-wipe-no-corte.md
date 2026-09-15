# ADR-012 — Dado de teste: wipe controlado no corte para produção, sem flag por linha

> Registro de decisões arquiteturais e de produto — 2026-09-15.

**Status:** aceito

**Contexto.** A Fase 8 do roadmap (`docs/NOVO-MARKETING-OS-ESPECIFICACAO.md`, linha 204) lista como entregável "dado de teste marcado e segregado" e como critério de conclusão "zero dado real até este ponto; entrada de dado real é decisão explícita e posterior". Nenhuma migration das Fases 1-7 implementa marcação de dado de teste — não existe coluna `is_teste`, `ambiente` ou equivalente em nenhuma tabela. Antes de escrever qualquer schema novo pra isso, a pergunta precisava ser respondida: o sistema vai conviver com dado de teste e dado real na mesma base (exigindo marcação permanente e RLS/telas que filtrem por isso), ou o dado de teste é descartável por inteiro no momento do corte para produção?

**Decisão: sem coluna de marcação em nenhuma tabela transacional. Tudo criado até o corte para produção é considerado dado de teste por definição. No corte, um script de limpeza controlado (preparado com antecedência, executado só quando o usuário decidir explicitamente que "entrada de dado real" começa) apaga o conteúdo das tabelas transacionais, preservando tabelas de catálogo/configuração.**

Motivo: o requisito real é "não confundir dado de teste com dado real depois que dado real existir" — uma marcação por linha resolveria isso, mas exigiria alterar todas as ~35 tabelas já construídas (adicionar coluna, ajustar RLS de cada uma pra filtrar por ambiente, ajustar cada hook/tela que lista dado pra excluir teste), pelo resto da vida do sistema, pra um problema que só existe **uma vez**, no instante do corte. Depois do corte, não há mais "dado de teste" a distinguir — o sistema já nasce em modo produção. Wipe é a solução do tamanho do problema; marcação permanente seria abstração para um caso de uso que dura um dia.

## O que fica preservado no corte (catálogo/configuração, não dado transacional de teste)

- `papeis`, `permissoes_concedidas` — modelo de permissão, não dado operacional.
- `system_options` — catálogo de opção de campo (ex. `core/pdv_tipo`).
- `categorias_checklist`, `perguntas_checklist` — configuração do módulo Merchandising (o quê se avalia), não uma avaliação em si.
- `estudio_categorias` — configuração de canal do Estúdio.
- `analise_pesos_tipo`, `analise_clusters_config` — configuração de clusterização (Fase 7).

## O que é candidato a wipe (dado transacional criado durante a construção)

Toda tabela que representa um registro de negócio criado por um usuário testando o fluxo: `pdvs`, `usuarios`/`usuario_papeis`, `fornecedores`/`fornecedor_usuarios`, `outdoors`, `contratos`/`contrato_outdoors`, `avaliacoes_outdoor`, `manutencoes`/`manutencao_fotos`, `avaliacoes_pdv`/`respostas_checklist`/`planos_acao`, `materiais`, `solicitacoes_material`, `campanhas`, `demandas_criativas` e tabelas filhas, `aprovacao_itens`/`aprovacao_revisores`/`aprovacao_decisoes`, `estudio_templates`/`estudio_template_areas`/`estudio_elementos`/`estudio_composicoes`/`estudio_composicao_elementos`, `brand_library`, `analise_clusters_calculo`/`analise_insights` (snapshot derivado — recalculado do zero assim que dado real de Mídia Externa/Merchandising existir, não precisa nem de DELETE explícito, um `analise_recalcular()` já reescreve tudo).

## Três casos que NÃO têm resposta óbvia — decisão explícita no momento do corte, não agora

1. **`usuarios`.** Está ligada 1:1 a `auth.users` (Supabase Auth). Um wipe ingênuo (`delete from usuarios`) não apaga a conta de autenticação correspondente, e um usuário real (ex. quem está testando o sistema hoje, incluindo contas de administração já em uso) não pode simplesmente sumir no corte. O script de corte precisa de uma lista explícita de quais `usuarios` são "conta real que fica" vs "conta de teste descartável", decidida por quem opera o corte — não é algo que um script genérico possa inferir sozinho.
2. **`audit_logs`.** É trilha de auditoria imutável (INSERT-only, por decisão de arquitetura do próprio sistema — ver seção de segurança da especificação). Apagar o histórico de auditoria do período de construção destrói justamente o tipo de registro que essa tabela existe para preservar. Alternativa a decidir no corte: preservar `audit_logs` integralmente (aceitar que ele terá entradas "pré-produção" misturadas, identificáveis pela data) em vez de apagar.
3. **Conteúdo reutilizável do Estúdio/Biblioteca de Marca.** Templates, elementos e artes cadastrados durante a construção podem ser, na prática, o material real que o marketing pretende usar em produção (não "dado de teste" no sentido de PDV fictício) — ou podem ser só rascunho de validação de fluxo. Isso é uma decisão de conteúdo do time de marketing, não uma inferência técnica.

## O que esta ADR entrega, e o que fica pendente

- Entregue: a decisão (wipe, não flag) e a classificação inicial de tabela transacional vs catálogo.
- Pendente, tarefa futura, só na hora do corte real: o script de limpeza em si (`TRUNCATE`/`DELETE` com a lista final de tabelas, ordem de FK, e as três decisões explícitas acima já resolvidas por quem operar o corte). Não escrito nesta ADR de propósito — é uma operação destrutiva que só faz sentido revisar linha por linha no dia em que for de fato executada, não preparada com antecedência e esquecida até lá.

## Alternativa descartada — flag `is_teste` por linha

Descartada pelo motivo já exposto na decisão: resolve um problema permanente (schema mais complexo, RLS mais complexa, toda tela precisando decidir se mostra dado de teste) para um evento que acontece uma vez. Reconsiderar só se o produto passar a precisar de um ambiente de "sandbox" permanente convivendo com produção — não é o caso hoje.

## Alternativa descartada — projeto Supabase separado por ambiente (staging vs produção)

Descartada por ora: dobra a superfície de configuração (duas URLs/chaves, duas aplicações manuais de migration, já que não há CLI linkada nesta máquina) para um projeto que ainda está em fase de construção de funcionalidade, não de operação contínua com múltiplos ambientes. Fica registrado como opção real para quando o sistema entrar em operação de fato e precisar de um ambiente de homologação contínuo (não só um corte único) — decisão a revisitar na Fase 8 se isso vier a ser necessário.
