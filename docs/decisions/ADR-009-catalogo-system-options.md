# ADR-009 — Catálogo genérico de opção de campo: `system_options`

> Registro de decisões arquiteturais e de produto — 2026-09-08.

**Status:** aceito

**Contexto.** A Fase 1 (Core) deixou `pdvs.tipo` como texto livre de propósito, sinalizando a pendência: a convenção do projeto ("opção de campo vem de `system_options`, nunca de enum hardcoded no frontend") pressupunha uma tabela que ainda não existia. O usuário testou a tela de PDV e confirmou a necessidade — e que `pdvs.tipo` não é o único campo de opção que o projeto vai precisar: `contratos.forma_pagamento` já tem a mesma pendência registrada na Fase 2, e outros campos de outros módulos vão repetir o padrão.

**Decisão.** Uma única tabela genérica, não uma tabela por campo:

```
system_options (id, modulo, campo, valor, rotulo, ordem, is_active, created_at, updated_at)
unique (modulo, campo, valor)
```

- `valor` é o dado curto e estável gravado na tabela de negócio (ex.: `'POS'`); `rotulo` é só o texto de exibição (ex.: `'Posto'`) e pode mudar livremente sem afetar dado já gravado.
- Toda opção de campo do projeto (presente e futura) usa esta mesma tabela, filtrando por `modulo`/`campo` — nunca uma tabela nova por campo, nunca `ALTER TYPE` de enum.
- Validação de que a coluna de negócio só aceita valor do catálogo ativo é feita por **trigger** (`BEFORE INSERT OR UPDATE`), não por `CHECK`: `CHECK` do Postgres não pode referenciar outra tabela (a expressão precisa ser avaliável por linha, sem subquery). O trigger é `SECURITY DEFINER` para não depender do grant de leitura de `system_options` de quem está gravando a linha de negócio.
- Leitura de `system_options` é liberada replicando o grant de quem já pode criar/editar a entidade consumidora (hoje: quem tem `has_permission('core','pdvs','criar'|'editar','rede_toda')`), não um grant genérico de leitura para todo `authenticated` — mantém o mesmo modelo fail-closed do resto do banco (ADR-006). Escrita (gestão do catálogo) é restrita a `super_admin`/`admin` via um recurso próprio `core/system_options`, seguindo o mesmo padrão de `papeis`.

**Consequência.** Cada novo módulo que adotar `system_options` para um campo próprio precisa acrescentar sua própria condição de leitura à policy de `SELECT` (ela cresce por `OR`, um por consumidor) — não decidido nem antecipado nesta migration para consumidores que ainda não existem. Enums/`CHECK` no banco continuam reservados para máquina de estado (ex.: `pdvs.status`, `manutencoes.status`, `outdoors.status_operacional`) — o critério de corte é: resultado computado ou transição controlada usa `CHECK`; opção que um usuário administrativo deveria poder adicionar sem migration usa `system_options`.
