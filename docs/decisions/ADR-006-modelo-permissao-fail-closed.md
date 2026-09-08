# ADR-006 — Modelo de permissão do Marketing OS novo: fail-closed em dado

> Registro de decisões arquiteturais e de produto — 2026-09-08.

**Status:** aceito

**Contexto.** `AUDIT-001-RESULTADO.md` §12 confirma que a matriz `role_permissions` do sistema antigo é fail-open (ausência de registro = permitido) e **puramente decorativa no banco** — nenhuma política RLS de tabela de negócio a consulta; o controle real de dado depende só de checagens fixas de papel embutidas em cada política. Esse é o risco classificado como ALTO na auditoria: "falsa sensação de controle de acesso granular pelo administrador".

**Decisão.** O novo sistema inverte o padrão:

1. Toda política RLS de tabela com dado de negócio é **fail-closed**: ausência de grant explícito em `permissoes_concedidas` (papel × módulo × recurso × ação × escopo) resulta em acesso **negado**.
2. Exceção única: toggles de visibilidade de menu/UI que não expõem nem alteram dado (ex.: item de menu aparecer ou não) podem ser fail-open, porque não representam risco de segurança real — só afetam navegação.
3. A permissão granular é consultada pela própria RLS, nunca apenas pelo frontend — corrigindo a causa raiz do defeito documentado no sistema antigo.

**Consequência.** Todo módulo novo precisa de um seed de permissão completo no lançamento, sob risco de bloquear uso legítimo por ausência de configuração — custo aceito em troca de eliminar a classe de risco mais crítica identificada na auditoria do sistema antigo.
