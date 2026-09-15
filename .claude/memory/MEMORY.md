# MEMORY — Marketing OS

> Índice de memória de longo prazo. Carregado no início de toda sessão.
> Uma linha por entrada. Teto informal: ~130 linhas.
> Cada entrada tem um arquivo próprio em `.claude/memory/<slug>.md`.
>
> **Teste antes de adicionar:** uma sessão futura ficaria surpresa e grata de saber disso antes de começar?
> Não passa: coisa derivável de ler o código, prazo, contexto temporário, receita de debug, ou algo já documentado no `CLAUDE.md`.

## Índice

- [Permissões por papel são fail-open](permissoes-por-papel-sao-fail-open.md) — ausência de registro em `role_permissions` equivale a **permitido**; confirmado que a matriz é decorativa, nenhuma RLS a consulta
- [Pseudo-status de material vivem em admin_notes](pseudo-status-material-em-admin-notes.md) — `[SEPARADO]` e `[CANCELADO]` são prefixos de texto, não valores de enum
- [Três fluxos de manutenção coexistem](tres-fluxos-de-manutencao.md) — pacotes+work orders, OS formal e atribuição direta rodam em paralelo, sem regra que os conecte
- [Itens de menu obrigatórios são forçados](itens-de-menu-obrigatorios-forcados.md) — gravar `false` em certos itens de gerente/diretor não desabilita nada
- [Menu: fail-open no gerente, fail-closed no diretor](menu-permissoes-fail-open-vs-fail-closed.md) — item não obrigatório sem configuração some no menu do diretor e aparece no do gerente
- [Reset de ciclo preserva postos incompletos](reset-ciclo-preserva-postos-incompletos.md) — mudar periodicidade não zera todo mundo, de propósito
- [Clusterização usa o primeiro cluster do tipo](clusterizacao-usa-primeiro-cluster.md) — configuração divergente entre clusters do mesmo tipo é silenciosamente ignorada
- [Telas órfãs sem rota no módulo Outdoor](telas-orfas-modulo-outdoor.md) — seis arquivos existem e não estão roteados; não são código morto óbvio
- [ServiceOrders tem inserção de dados fictícios](service-orders-dados-ficticios.md) — botão só aparece para super_admin, mas grava em IDs de outdoor/fornecedor com aparência real
- [RLS sem isolamento por pdv_id](rls-sem-isolamento-por-pdv.md) — `pdvs`, `service_orders`, `maintenance_requests` e `profiles` não restringem por posto no banco, apesar do PRD dizer que sim
- [Módulo Loteamentos congelado](modulo-loteamentos-congelado.md) — decisão do usuário (2026-09-03): nenhuma ação técnica no módulo até nova autorização; `loteamentos_lancamentos` não existe no banco real
- [Responder sempre em português](feedback-idioma-portugues.md) — inclusive perguntas via AskUserQuestion; pedido explícito do usuário (2026-09-14)
- [Duas famílias de Edge Function de token em Aprovações](edge-functions-legado-aprovacoes-nao-reaproveitar.md) — 3 são legado (`validate-access-token`...), 3 são do ADR-011 e já estão completas (`send-approval-request`...)

---

## Exemplos do que **não** entra aqui

Registrados de propósito, para calibrar o critério:

- "O projeto usa React 18 e Vite" — deriva do `package.json`, e já está no `CLAUDE.md`.
- "O comando de build é `npm run build`" — já está na seção de comandos canônicos. Duplicar cria duas fontes da verdade.
- "Rodar os testes antes da demo de sexta" — prazo, não lição durável.
- "Reiniciar o dev server resolveu o erro de import" — receita de debug; isso mora na mensagem do commit.
