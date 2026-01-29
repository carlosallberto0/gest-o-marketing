
## Objetivo (o que precisa ficar “à prova de teste”)
1) Quando o Super Admin desmarcar **Solicitações de Manutenção** e **Solicitar Materiais** (Mídia Externa), o **perfil Gerente não pode ver esses itens no menu**.
2) Mesmo que o gerente tente acessar a rota diretamente (digitando URL), o sistema deve **bloquear o acesso** (não apenas esconder o menu).
3) Melhorar a UI do módulo Configurações: as opções devem ficar em **abas usáveis** (sem ficar “apertado”/escondido).

---

## Diagnóstico (com base no que já está no código e no backend)
- A configuração **está salva corretamente** no backend (ex.: `media.solicitacoes_manutencao=false` e `media.solicitar_materiais=false`).
- A leitura dessa chave também está liberada para usuários autenticados (política de leitura existe).
- No frontend, a lógica atual tem um ponto fraco: **se `managerPermissions` estiver `undefined` (carregando/erro)**, a função `isMenuItemEnabled()` retorna `true` (fallback permissivo), então o menu **continua mostrando itens indevidos**.
  - Isso pode acontecer por:
    - carregamento inicial (race condition),
    - erro silencioso de query,
    - cache do React Query reaproveitado entre sessões/usuários,
    - `activeModule` não estar definido em alguns fluxos (refresh, deep-link), fazendo a checagem não rodar.

---

## Solução proposta (parte 1): menu do gerente realmente respeitar as permissões
### A) Tornar o filtro “deny-by-default” para itens configuráveis
Ajustar a filtragem no `AppLayout.tsx` para:
- **Sempre mostrar itens obrigatórios** (ex.: `Avaliar Outdoor`).
- Para itens configuráveis (os que existem no `pathToMenuKey`), **não mostrar enquanto permissões não carregarem**.
- Depois que carregar, aplicar o `isMenuItemEnabled()` normalmente.

**Resultado esperado:** mesmo se houver atraso/erro no fetch, o gerente não vê “Solicitações de Manutenção” e “Solicitar Materiais”.

### B) Corrigir cache/refetch para não reaproveitar permissões antigas
Ajustar o hook `useManagerMenuPermissions()` para evitar que:
- um usuário herde cache de outro,
- ou que o app “fique preso” no valor default.

Mudanças recomendadas:
- incluir `userId` (ou `profile.id`) no `queryKey`: `['manager-menu-permissions', userId]`
- definir `refetchOnMount: 'always'` e `refetchOnWindowFocus: true` (para pegar alterações após salvar)

### C) Garantir segurança também nas rotas (não só no menu)
Criar um guard de rota específico para gerente, por exemplo:
- `RequireManagerMenuPermission` (componente)
  - se `profile.role !== 'manager'`: deixa passar
  - se for `manager`:
    - carrega permissões
    - verifica se a rota atual está habilitada para o módulo ativo (e, no caso de `/material-requests`, usar `activeModule` para decidir qual conjunto aplicar)
    - se desabilitado: redireciona para a rota default do gerente (ex.: `/outdoor-evaluation`) + toast “Acesso não permitido”.

Aplicar esse guard nas rotas:
- `/maintenance-requests`
- `/material-requests`

**Resultado esperado:** mesmo que o menu apareça por qualquer motivo, **o acesso efetivo fica bloqueado**.

### D) Ajuste extra (robustez)
- Forçar que chaves “obrigatórias” sejam tratadas como `true` mesmo que o JSON venha errado (por exemplo, alguém edita manualmente no banco).
  - Ex.: `avaliar_outdoor` nunca pode ficar oculto.

---

## Solução proposta (parte 2): melhorar a UI das opções em Configurações (abas)
Hoje a tela “Geral” tem muitas abas e a barra está ficando ruim (apertada / aparenta mostrar só “Gerentes” em alguns layouts).

### Opção recomendada (melhor UX e simples de manter)
**Reestruturar em 2 níveis:**
- **Abas principais (poucas):**
  - “Marca & Aparência”
  - “Operacional”
  - “Relatórios”
  - “Gerentes”
- Dentro de cada aba principal, usar **sub-abas** (ou cards) para as opções específicas.

Isso reduz “13 abas” para “4 abas” e elimina o layout comprimido.

### Alternativa (mudança mínima)
Manter as abas atuais, mas corrigir a barra para:
- usar `flex` ao invés de `grid-cols-13`
- permitir `overflow-x-auto` com `whitespace-nowrap`
- adicionar “wrap” no desktop e “scroll horizontal” no mobile

**Resultado esperado:** o usuário vê claramente todas as opções e consegue navegar como “abas” de verdade.

---

## Arquivos que serão alterados (implementação)
1) `src/components/layout/AppLayout.tsx`
   - mudar regra de filtragem do menu (deny-by-default para itens configuráveis)
   - tratar obrigatórios como sempre visíveis
2) `src/hooks/useManagerMenuPermissions.ts`
   - melhorar `queryKey` e política de refetch
3) `src/App.tsx`
   - envolver rotas `/maintenance-requests` e `/material-requests` com o guard novo
4) (novo) `src/components/auth/RequireManagerMenuPermission.tsx` (ou nome equivalente)
   - guard de permissão para gerente baseado em `manager_menu_permissions`
5) `src/pages/Settings.tsx` (ou o componente de Configurações “Geral”)
   - reestruturação das abas (2 níveis) ou correção do TabsList (alternativa mínima)

---

## Plano de testes (obrigatório para validar)
1) Logar como **Super Admin**
   - desmarcar “Solicitações de Manutenção” e “Solicitar Materiais” no módulo Mídia Externa
   - salvar
2) Logar como **Gerente**
   - entrar em Mídia Externa → confirmar que o menu mostra somente “Avaliar Outdoor”
   - dar refresh (F5) → menu deve continuar correto
3) Teste de segurança:
   - como gerente, tentar abrir diretamente:
     - `/maintenance-requests`
     - `/material-requests`
   - deve redirecionar para `/outdoor-evaluation` (ou rota default) e mostrar aviso
4) Teste da UI de Configurações:
   - validar navegação por abas em desktop e mobile (scroll/wrap funcionando)

---

## Observações importantes
- Isso segue o princípio “Integração, não substituição”: continuamos usando `system_settings` como fonte única para configuração.
- Mesmo com controle visual, a segurança correta exige o guard de rota (item C), para impedir bypass por URL.
