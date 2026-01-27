

# Plano de Correcao: Atualizar URLs de Acesso

## Problema Identificado

O sistema esta usando a URL `https://gestao-e-marketing.lovable.app`, mas a URL publicada real do projeto e `https://retail-rise-guide.lovable.app`. Isso faz com que os links de acesso dos usuarios nao funcionem.

---

## Arquivos a Modificar

### 1. src/hooks/usePublicAppUrl.ts

**Linha 8**: Alterar a constante PUBLIC_APP_URL

```typescript
// DE:
const PUBLIC_APP_URL = 'https://gestao-e-marketing.lovable.app';

// PARA:
const PUBLIC_APP_URL = 'https://retail-rise-guide.lovable.app';
```

---

### 2. supabase/functions/generate-access-link/index.ts

**Linha 123**: Alterar a URL no endpoint de geracao de links

```typescript
// DE:
const PUBLIC_APP_URL = 'https://gestao-e-marketing.lovable.app';

// PARA:
const PUBLIC_APP_URL = 'https://retail-rise-guide.lovable.app';
```

---

### 3. supabase/functions/validate-access-token/index.ts

**Linha 93**: Alterar a URL no endpoint de validacao de tokens

```typescript
// DE:
const PUBLIC_APP_URL = 'https://gestao-e-marketing.lovable.app';

// PARA:
const PUBLIC_APP_URL = 'https://retail-rise-guide.lovable.app';
```

---

### 4. supabase/functions/create-user/index.ts

**Linha 75**: Alterar a URL na criacao de usuarios

```typescript
// DE:
const PUBLIC_APP_URL = 'https://gestao-e-marketing.lovable.app';

// PARA:
const PUBLIC_APP_URL = 'https://retail-rise-guide.lovable.app';
```

---

## Impacto da Mudanca

| Aspecto | Antes | Depois |
|---------|-------|--------|
| URL base | gestao-e-marketing.lovable.app | retail-rise-guide.lovable.app |
| Links novos | Funcionarao | Funcionarao |
| Links antigos | Nao funcionavam | Nao funcionarao (dominio antigo) |
| Super Admin | Nao afetado (usa login normal) | Nao afetado (usa login normal) |

---

## Acao Pos-Implementacao

Apos aplicar as alteracoes, sera necessario **regenerar os links de acesso** para os usuarios que ja foram cadastrados. Isso pode ser feito de duas formas:

1. **Individual**: Na pagina de Usuarios, clicar no icone de link ao lado de cada usuario para gerar um novo link

2. **Em massa**: Reimportar a planilha de usuarios (os usuarios existentes serao ignorados com erro "email ja registrado", mas voce pode usar a funcionalidade de regenerar links individualmente)

---

## Ordem de Execucao

1. Atualizar usePublicAppUrl.ts (hook do frontend)
2. Atualizar generate-access-link/index.ts (edge function)
3. Atualizar validate-access-token/index.ts (edge function)
4. Atualizar create-user/index.ts (edge function)
5. Testar criando um novo usuario
6. Regenerar links para usuarios existentes

---

## Super Admin - Nao Afetado

O Super Admin continua usando login tradicional (email/senha) atraves da tela /auth. Esta mudanca afeta apenas os links de acesso personalizados usados por gerentes, diretores e coordenadores.

