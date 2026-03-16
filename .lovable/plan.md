

# Corrigir Erro de Código Duplicado ao Criar Outdoor

## Problema

A função `generateCode` em `NewOutdoorDialog.tsx` (linha 71-79) gera o código do outdoor usando `count + 1` (total de registros na tabela + 1). Isso falha quando:
- Um outdoor foi excluído (ex: existem 163 outdoors mas o último código é OUT-0164)
- Tentativas anteriores criaram registros que deslocaram a contagem

O resultado é a tentativa de criar um código como `OUT-0163` que já existe, causando o erro `duplicate key value violates unique constraint "outdoors_code_key"`.

## Solução

Alterar `generateCode` para buscar o **maior código existente** na tabela e incrementar a partir dele, em vez de usar a contagem total.

### Alteração em `src/components/dialogs/NewOutdoorDialog.tsx`

Substituir a lógica atual (linhas 71-79):
```typescript
const generateCode = async () => {
  const { data } = await supabase
    .from('outdoors')
    .select('code')
    .like('code', 'OUT-%')
    .order('code', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastCode = data[0].code;
    const match = lastCode.match(/OUT-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  const code = `OUT-${String(nextNumber).padStart(4, '0')}`;
  setFormData(prev => ({ ...prev, code }));
};
```

Isso busca o último código `OUT-XXXX` ordenado de forma decrescente e incrementa o número, evitando colisões.

### Arquivos
- **Editar**: `src/components/dialogs/NewOutdoorDialog.tsx` (apenas a função `generateCode`)

