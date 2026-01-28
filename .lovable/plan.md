
# Plano: Controle de Menu para Gerentes com Redirecionamento Automatico

## Resumo da Solicitacao

O usuario precisa de tres funcionalidades:
1. Esconder "Status dos Outdoors" e "Outdoors Recentes" do perfil Gerente
2. Redirecionar automaticamente o Gerente para "Avaliar Outdoor" ao acessar o modulo
3. Permitir ao Super Admin ativar/desativar opcoes de menu para Gerentes nas configuracoes

---

## Fase 1: Banco de Dados

### Nova Configuracao em `system_settings`

Criar uma nova entrada na tabela `system_settings` para armazenar as permissoes de menu por perfil:

```text
key: manager_menu_permissions
value: {
  "media": {
    "avaliar_outdoor": true,
    "solicitacoes_manutencao": true,
    "solicitar_materiais": true
  },
  "merchandising": {
    "avaliacao_pdv": true,
    "solicitar_materiais": true,
    "dashboard": false,
    "historico": true
  },
  "default_redirect": {
    "media": "/outdoor-evaluation",
    "merchandising": "/checklist"
  }
}
```

Este formato permitira:
- Controlar visibilidade de cada item de menu por modulo
- Definir a rota padrao de redirecionamento quando o gerente acessa cada modulo

---

## Fase 2: Hook de Permissoes de Menu

### Novo arquivo: `src/hooks/useManagerMenuPermissions.ts`

```text
Funcionalidades:
- useManagerMenuPermissions(): Busca as permissoes atuais
- useUpdateManagerMenuPermissions(): Atualiza as permissoes
- isMenuItemEnabled(module, menuKey): Verifica se item esta ativo
- getManagerDefaultRoute(module): Retorna rota padrao de redirecionamento

Valores padrao:
- Todos os itens atuais do gerente ativos
- Redirecionamento padrao: /outdoor-evaluation (media), /checklist (merchandising)
```

---

## Fase 3: Modificacoes na Interface

### 3.1 MediaDashboard.tsx

**Alteracoes:**
- Esconder completamente a secao "Status dos Outdoors" para gerentes
- Esconder a secao "Outdoors Recentes" para gerentes
- Manter apenas o header com o botao "Avaliar Outdoor"

```text
Codigo atual (linha 90):
{!isManager && (
  // Stats cards...
)}

Adicionar tambem:
- Esconder o card "Status Distribution" (linhas 168-213) para gerentes
- Esconder "Outdoors Recentes" (linhas 297-343) para gerentes
```

### 3.2 ModuleSelection.tsx

**Alteracoes:**
- Ao selecionar o modulo, verificar se o usuario e gerente
- Se for gerente, redirecionar para a rota configurada (padrao: /outdoor-evaluation)
- Usar o hook useManagerMenuPermissions para obter a rota

```text
handleModuleSelect(moduleId, path) {
  if (profile?.role === 'manager') {
    const managerPath = getManagerDefaultRoute(moduleId);
    navigate(managerPath || path);
  } else {
    navigate(path);
  }
}
```

### 3.3 AppLayout.tsx

**Alteracoes:**
- Filtrar os itens de menu usando as permissoes configuradas
- Integrar com o hook useManagerMenuPermissions

```text
Logica atual (linha 181-185):
const filteredMenuItems = menuItems.filter(...)

Nova logica:
- Alem das roles, verificar tambem se o item esta ativo nas permissoes
- Para gerentes: checar isMenuItemEnabled(activeModule, item.menuKey)
```

---

## Fase 4: Interface de Configuracao (Super Admin)

### Novo componente: `src/components/settings/ManagerMenuSettings.tsx`

```text
Interface:
- Card com titulo "Permissoes de Menu para Gerentes"
- Selecionar modulo (Midia Externa, Merchandising)
- Lista de itens de menu com Switch para cada um
- Campo para definir rota padrao de redirecionamento
- Botao Salvar

Itens de menu controlaveis para Midia Externa:
- Avaliar Outdoor (sempre visivel - nao pode desativar)
- Solicitacoes de Manutencao
- Solicitar Materiais

Itens de menu controlaveis para Merchandising:
- Dashboard
- Avaliacao de PDV (sempre visivel)
- Historico de Avaliacoes
- Solicitar Materiais
```

### 4.2 Adicionar aba em Settings.tsx

```text
Nova TabsTrigger: "Gerentes"
Icone: Users
Valor: "managers"
Conteudo: <ManagerMenuSettings />
```

---

## Fase 5: Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| src/hooks/useManagerMenuPermissions.ts | CRIAR | Hook para gerenciar permissoes de menu |
| src/components/settings/ManagerMenuSettings.tsx | CRIAR | Interface de configuracao |
| src/pages/MediaDashboard.tsx | MODIFICAR | Esconder secoes para gerente |
| src/pages/ModuleSelection.tsx | MODIFICAR | Redirecionar gerente para rota configurada |
| src/components/layout/AppLayout.tsx | MODIFICAR | Filtrar menu baseado em permissoes |
| src/pages/Settings.tsx | MODIFICAR | Adicionar aba "Gerentes" |

---

## Detalhes Tecnicos

### Estrutura do Hook useManagerMenuPermissions

```typescript
interface ManagerMenuPermissions {
  media: {
    avaliar_outdoor: boolean;
    solicitacoes_manutencao: boolean;
    solicitar_materiais: boolean;
  };
  merchandising: {
    dashboard: boolean;
    avaliacao_pdv: boolean;
    historico: boolean;
    solicitar_materiais: boolean;
  };
  default_redirect: {
    media: string;
    merchandising: string;
  };
}
```

### Mapeamento de Menu Keys

Para conectar as permissoes aos itens do AppLayout:

```text
Midia Externa:
- /outdoor-evaluation -> avaliar_outdoor
- /maintenance-requests -> solicitacoes_manutencao
- /material-requests -> solicitar_materiais

Merchandising:
- /merchandising/dashboard -> dashboard
- /checklist -> avaliacao_pdv
- /history -> historico
- /material-requests -> solicitar_materiais
```

### Componente ManagerMenuSettings

```text
Layout:
+------------------------------------------+
| Permissoes de Menu para Gerentes         |
+------------------------------------------+
| Modulo: [Midia Externa v]                |
+------------------------------------------+
| Rota Padrao: [/outdoor-evaluation    ]   |
| (Para onde o gerente vai ao entrar)      |
+------------------------------------------+
| Itens do Menu:                           |
|                                          |
| [x] Avaliar Outdoor       (obrigatorio)  |
| [x] Solicitacoes de Manutencao           |
| [x] Solicitar Materiais                  |
+------------------------------------------+
| [Salvar Alteracoes]                      |
+------------------------------------------+
```

---

## Comportamento Esperado

### Para Gerentes:
1. Ao fazer login e selecionar Midia Externa, vai direto para /outdoor-evaluation
2. No menu lateral, ve apenas os itens habilitados pelo Super Admin
3. No Dashboard (se acessar diretamente), nao ve "Status dos Outdoors" nem "Outdoors Recentes"

### Para Super Admin:
1. Em Configuracoes > Gerentes, pode ativar/desativar cada item de menu
2. Pode definir a pagina padrao de entrada para gerentes em cada modulo
3. Nao pode desativar itens obrigatorios (ex: Avaliar Outdoor e obrigatorio)

---

## Ordem de Implementacao

1. Criar hook useManagerMenuPermissions.ts
2. Modificar MediaDashboard.tsx (esconder secoes)
3. Modificar ModuleSelection.tsx (redirecionamento)
4. Modificar AppLayout.tsx (filtrar menu)
5. Criar ManagerMenuSettings.tsx
6. Modificar Settings.tsx (adicionar aba)

---

## Notas de Seguranca

- As permissoes sao apenas visuais (ocultam menu items)
- As rotas continuam protegidas pelo RequireRole
- Gerentes nao conseguem acessar rotas administrativas mesmo que tentem navegar diretamente
- O Super Admin pode restaurar as configuracoes padrao a qualquer momento
