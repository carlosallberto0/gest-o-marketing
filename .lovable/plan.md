
Diagnóstico confirmado

- As permissões do Diretor estão corretas no backend: Dashboard, Outdoors e Relatórios estão desabilitados.
- O frontend também está lendo isso corretamente; os logs mostram esses três itens como `false`.
- O problema do preview atual é outro: a sessão autenticada que está aberta no preview não é Diretor, e sim Super Admin.
- Enquanto o preview estiver com Super Admin logado, o menu continuará exibindo opções administrativas. Nenhuma regra de menu do Diretor vai esconder isso nessa sessão.

Plano para resolver de vez

1. Parar de mexer na filtragem do Diretor por enquanto
- A leitura das permissões já está funcionando.
- A próxima correção precisa focar no contexto de autenticação e validação, não em mais filtros de menu.

2. Deixar o perfil ativo explícito na interface
- Mostrar no cabeçalho/sidebar algo como:
  - Perfil ativo: Super Admin
  - Perfil ativo: Diretoria
- Isso evita testar o menu do Diretor com a conta errada sem perceber.

3. Validar com uma conta realmente Diretora
- Fazer o teste com um usuário cujo perfil no backend seja de fato `director`.
- Se necessário, preparar um usuário de teste de Diretoria ou usar um link de acesso desse perfil.
- Só esse teste confirma o comportamento real do menu do Diretor.

4. Adicionar depuração visual de acesso
- Exibir em modo de desenvolvimento:
  - role atual do usuário autenticado
  - módulo ativo
  - permissões carregadas do menu do Diretor
- Assim fica impossível confundir “bug de permissão” com “usuário logado errado”.

5. Se a intenção for testar o mesmo usuário como Diretor
- Isso não é mais um ajuste de menu.
- Aí precisamos implementar um fluxo separado e seguro de troca de conta/impersonação no backend.
- Simular papel no cliente não é aceitável nem seguro.

Resultado esperado

- O sistema vai deixar claro qual perfil está realmente logado.
- O teste do Diretor passará a ser feito com a conta correta.
- Quando o usuário autenticado for realmente Diretor, o menu deverá mostrar apenas:
  - Aprovar Manutenção
  - Observações Enviadas

Detalhes técnicos

- O backend retornou corretamente:
  - `dashboard = false`
  - `outdoors = false`
  - `relatorios = false`
  - `aprovar_manutencao = true`
  - `observacoes_enviadas = true`
- Mesmo assim, o preview atual continua mostrando mais itens porque a sessão ativa aberta no preview está associada a um perfil com role `super_admin`.
- Conclusão: neste momento, o bloqueio do Diretor não está falhando; ele simplesmente não está sendo testado com um Diretor real.
