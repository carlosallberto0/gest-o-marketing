
# Plano de Correção: Permissões de Menu para Gerentes Não Funcionando

## Problema Identificado

As configurações de menu estão sendo salvas corretamente no banco de dados. A configuração atual mostra:

```
media: {
  avaliar_outdoor: true,
  solicitacoes_manutencao: false,  ← desativado
  solicitar_materiais: false       ← desativado
}
```

Porém, o **gerente não consegue ler** essas configurações devido às políticas RLS (Row Level Security) da tabela `system_settings`.

### Políticas RLS Atuais

| Política | Tipo | Quem Pode |
|----------|------|-----------|
| Super admins can read settings | SELECT | Apenas super_admin |
| Allow public read for login screen settings | SELECT | Apenas para chaves `login_screen_settings` e `public_app_url` |

**Resultado**: Quando o gerente acessa o sistema, o hook `useManagerMenuPermissions` falha na leitura e retorna os valores padrão (que têm todos os itens habilitados).

---

## Solução

Adicionar uma nova política RLS que permite que **todos os usuários autenticados** leiam a configuração `manager_menu_permissions`.

### Migration SQL

```sql
CREATE POLICY "Allow authenticated read manager_menu_permissions" 
ON system_settings FOR SELECT 
TO authenticated 
USING (key = 'manager_menu_permissions');
```

Esta política permitirá que qualquer usuário autenticado (incluindo gerentes) consiga ler as permissões de menu.

---

## Alterações Técnicas

| Ação | Descrição |
|------|-----------|
| Criar migration SQL | Adicionar política RLS para leitura de `manager_menu_permissions` |
| Sem alteração de código | O hook já está preparado para funcionar corretamente |

---

## Comportamento Após a Correção

1. **Gerente acessa o sistema** → Hook busca as permissões do banco de dados
2. **Permissões lidas corretamente** → Itens desativados são filtrados do menu
3. **Menu exibe apenas itens permitidos** → "Solicitações de Manutenção" e "Solicitar Materiais" ficam ocultos

---

## Segurança

- A política é apenas de **leitura (SELECT)**
- Somente o **super_admin** pode modificar essas configurações
- Gerentes podem ler mas **não podem alterar** as permissões
