

# Melhorar UX do Diálogo de Rotas — Responsivo + Dados da OS do Fornecedor

## Problemas

1. **UX não responsiva**: O `CreateRouteDialog` usa `max-w-lg` fixo, sem adaptação para mobile. Labels e campos não são visíveis (como mostra a screenshot com textos cortados).
2. **Dados genéricos**: O diálogo lista todos os outdoors do mapa, sem contexto das ordens de serviço ativas. O Super Admin precisa selecionar manualmente cada outdoor em vez de aproveitar os itens já presentes nas OS dos fornecedores.

## Solução

### 1. Tornar o CreateRouteDialog responsivo
- Usar `max-w-[95vw] sm:max-w-lg` no `DialogContent`
- ScrollArea com altura dinâmica: `h-[40vh] sm:h-[250px]`
- Footer com botões empilhados em mobile: `flex-col sm:flex-row`
- Textos truncados com `truncate` nos nomes longos
- Badges menores em telas pequenas

### 2. Pré-carregar outdoors das OS ativas do fornecedor
- Importar `useSupplierWorkOrders` no diálogo
- Quando o usuário selecionar um fornecedor no Select, filtrar automaticamente os outdoors para mostrar apenas os que estão nas OS ativas desse fornecedor (status `pending` ou `in_progress`)
- Adicionar toggle "Mostrar apenas OS ativa" (default: ligado quando fornecedor selecionado)
- Pré-selecionar todos os outdoors da OS ao selecionar fornecedor
- Mostrar badge "Na OS" nos itens que pertencem a uma ordem de serviço

### 3. Tornar os outros dialogs responsivos também
- `UnifyRoutesDialog`: `max-w-[95vw] sm:max-w-md`
- `PackageSelectDialog` (inline no StrategicMapMapbox): mesmo tratamento
- `RoutePanel`: Ajustar para tela pequena com `w-full sm:w-64`

## Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/map/CreateRouteDialog.tsx` — responsivo + integração com OS |
| Editar | `src/components/map/UnifyRoutesDialog.tsx` — responsivo |
| Editar | `src/components/map/RoutePanel.tsx` — responsivo |
| Editar | `src/pages/StrategicMapMapbox.tsx` — PackageSelectDialog responsivo |

