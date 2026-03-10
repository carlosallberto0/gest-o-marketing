
Objetivo: garantir que, para o perfil Diretor no módulo Mídia Externa, o menu lateral mostre somente os itens habilitados pelo Super Admin. Se Dashboard, Outdoors e Relatórios estiverem desativados, o Diretor deverá ver apenas:
- Aprovar Manutenção
- Observações Enviadas

Diagnóstico confirmado
- A configuração está sendo salva corretamente no backend.
- A leitura também está funcionando: o registro retornado tem `dashboard: false`, `outdoors: false` e `relatorios: false`.
- Também identifiquei um estado inválido salvo hoje: `default_redirect.media` ainda está como `/media/dashboard`, mesmo com Dashboard desativado.
- O problema restante está no enforcement do frontend: a navegação do Diretor ainda não está sendo tratada de forma rígida o suficiente.

Plano de implementação
1. Reescrever a montagem do menu do Diretor no `AppLayout`
- Arquivo: `src/components/layout/AppLayout.tsx`
- Em vez de começar da lista completa de `mediaItems` e só “filtrar depois”, criar uma regra explícita para Diretor no módulo `media`:
  - construir apenas os 5 itens possíveis do Diretor;
  - renderizar somente os que estiverem habilitados;
  - manter sempre visíveis os obrigatórios:
    - `/maintenance-approval`
    - `/director-observations`
- Isso elimina qualquer chance de Dashboard, Outdoors e Relatórios aparecerem quando estiverem desligados.

2. Corrigir o redirecionamento padrão do Diretor
- Arquivo: `src/hooks/useDirectorMenuPermissions.ts`
- Ajustar `getDirectorDefaultRoute()` para nunca devolver rota desabilitada.
- Se o redirect salvo for inválido, cair automaticamente em:
  - `/maintenance-approval`
  - ou `/director-observations`

3. Forçar consistência na tela de configurações
- Arquivo: `src/components/settings/DirectorMenuSettings.tsx`
- Ao salvar, impedir combinações inválidas como:
  - Dashboard desativado + redirect para Dashboard
- Se o item escolhido como página inicial for desligado, trocar automaticamente para uma rota válida obrigatória.

4. Bloquear acesso direto por URL para itens desabilitados
- Novo arquivo: `src/components/auth/RequireDirectorMenuPermission.tsx`
- Aplicar nas rotas configuráveis do Diretor para impedir acesso manual a:
  - `/media/dashboard`
  - `/outdoors`
  - `/reports`
- Se estiver desabilitado, redirecionar para a rota válida do Diretor.

5. Aplicar o guard nas rotas
- Arquivo: `src/App.tsx`
- Envolver as rotas acima com o novo guard do Diretor.

Resultado esperado
- O Diretor não verá mais Dashboard, Outdoors e Relatórios no menu quando estiverem desligados.
- Ao entrar no sistema, cairá apenas em uma página permitida.
- Mesmo acessando URL manualmente, não conseguirá abrir páginas desativadas.

Arquivos envolvidos
- `src/components/layout/AppLayout.tsx`
- `src/hooks/useDirectorMenuPermissions.ts`
- `src/components/settings/DirectorMenuSettings.tsx`
- `src/components/auth/RequireDirectorMenuPermission.tsx` novo
- `src/App.tsx`

Detalhe técnico importante
- O backend já está retornando os valores corretos; portanto não é mais um problema de banco.
- A correção precisa concentrar a regra no frontend com uma abordagem rígida de allow-list para o Diretor, em vez de confiar apenas em filtros sobre o menu geral.
