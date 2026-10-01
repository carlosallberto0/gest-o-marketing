# ADR-005 — Isolamento do Marketing OS novo em relação ao Lovable

> Registro de decisões arquiteturais e de produto — 2026-09-08.

**Status:** aceito · **Contexto:** kickoff da reconstrução do zero do Marketing OS

**Contexto.** O usuário decidiu reconstruir o Marketing OS do zero (nova arquitetura, novo banco, novo frontend), mantendo o mesmo repositório GitHub (`gest-o-marketing`). O `ADR-001-sync-lovable-github.md` documenta que o Lovable sincroniza com o branch `main` de forma bidirecional e quase em tempo real — qualquer trabalho novo commitado em `main` enquanto o Lovable segue conectado corre risco real de sobrescrita cruzada.

Simultaneamente, existe uma correção de segurança já pronta e revisada (T-F, `sprint-0.1/onda-1`) que fecha um vazamento de token de acesso no sistema antigo, ainda não enviada. Havia também um estado não commitado, fora desta sessão, que trocava `project_id`/`.env` para um projeto Supabase diferente (`qlezexylaixllhakpezv`) — guardado em `git stash` na branch `sprint-0.1/onda-1`. A primeira decisão foi ignorá-lo e criar um projeto novo; o usuário reconsiderou em seguida, confirmou que esse projeto está vazio, e decidiu reaproveitá-lo como o projeto Supabase do sistema novo (2026-09-08).

**Decisão:**

1. O repositório continua sendo `gest-o-marketing` — não se cria um repositório novo.
2. Todo trabalho do sistema novo acontece na branch `v2/fase-0-fundacao` (criada a partir de `main`, em dia com `origin/main` em 2026-09-08) e em branches dela derivadas. Nenhum commit do sistema novo vai para `main` enquanto o Lovable estiver conectado ao sync automático.
3. Antes do desligamento do sistema antigo: validar (runbook manual, `docs/sprint-0.1/onda-1-runbook-validacao-manual.md`, disponível na branch `sprint-0.1/onda-1`) e enviar (push + PR para `main`) **só** a correção de segurança T-F. É a última mudança planejada para o sistema antigo.
4. Após o push do T-F, o usuário desconecta o Lovable do repositório e desliga o sistema antigo — ação na própria plataforma Lovable, fora do alcance das ferramentas desta sessão.
5. Só depois da desconexão confirmada, o trabalho acumulado em `v2/fase-0-fundacao` (ou seus sucessores) é promovido para `main`, que nesse ponto deixa de ser "o branch do Lovable" e passa a ser o branch do sistema novo.
6. O projeto Supabase do sistema novo é **`qlezexylaixllhakpezv`** (`https://qlezexylaixllhakpezv.supabase.co`), confirmado vazio pelo usuário em 2026-09-08. `.env` e `supabase/config.toml` da branch `v2/fase-0-fundacao` foram atualizados para apontar para ele, recuperando apenas essas duas partes do `git stash` — a mudança em `src/hooks/useAccessLinks.ts` (conserto específico do schema antigo) permanece só no stash, sem uso no sistema novo.

**Consequência.** Aceita-se um pequeno período de manutenção adicional no sistema antigo (só a correção de segurança), para não deixar uma falha já conhecida aberta enquanto a reconstrução avança. Em troca, evita-se o risco de o sync do Lovable sobrescrever ou se confundir com o código do sistema novo, sem precisar migrar para um repositório separado.

**Atualização (2026-10-01).** O usuário confirmou que o Lovable não tem nenhuma conexão com este projeto, em nenhuma instância. As restrições dos itens 2, 4 e 5, que condicionavam o envio para `main` à desconexão do Lovable, deixam de valer.
