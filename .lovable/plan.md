
# Plano de Implementacao: Importacao de Usuarios em Massa (Gerentes)

## Visao Geral

Criar uma funcionalidade para importar usuarios (especialmente gerentes) em massa via arquivo Excel ou CSV, seguindo o padrao ja existente no sistema (BulkImportDialog) e utilizando a edge function `create-user` ja implementada.

---

## Fase 1: Estrutura de Arquivos

### Novos Arquivos a Criar

```text
src/hooks/
  useBulkUserImport.ts           # Hook de logica de importacao

src/components/dialogs/
  BulkUserImportDialog.tsx       # Dialog de importacao em massa
```

### Arquivos a Modificar

```text
src/pages/Users.tsx              # Adicionar botao "Importar" no header
```

---

## Fase 2: Hook de Importacao (useBulkUserImport.ts)

### Campos Suportados na Planilha

| Coluna | Obrigatorio | Exemplo | Descricao |
|--------|-------------|---------|-----------|
| nome | Sim | "Carlos Silva" | Nome completo do gerente |
| email | Sim | "carlos@empresa.com" | Email unico |
| perfil | Sim | "gerente" | Valores: gerente, diretor, coordenador_compras, convenience_coordinator |
| pdv | Nao | "Posto Centro" | Nome do PDV para vincular (caso gerente) |
| modulos | Sim | "merchandising,media" | Modulos separados por virgula ou ponto-virgula |

### Funcionalidades do Hook

```text
Funcoes principais:
- generateUserTemplate() -> Gera CSV modelo
- parseExcelFile(file) -> Suporte a .xlsx e .csv
- validateRecords(records) -> Valida emails, perfis e PDVs
- processImport(records) -> Cria usuarios via edge function
- exportErrorLog(errors) -> Exporta log de erros

Estados:
- isProcessing: boolean
- progress: number (0-100)
- summary: { total, criados, erros[] }
```

### Logica de Importacao

```text
1. Parsear arquivo (XLSX ou CSV)
2. Normalizar headers (ignorar acentos/maiusculas)
3. Validar campos obrigatorios
4. Buscar PDVs existentes para mapeamento
5. Para cada registro valido:
   - Chamar edge function create-user
   - Aguardar resposta (access_link ou erro)
   - Registrar resultado
6. Gerar resumo final
```

---

## Fase 3: Componente de Dialog (BulkUserImportDialog.tsx)

### Fluxo de Telas (4 Steps)

```text
Step 1: UPLOAD
  - Area de drag-and-drop
  - Botao "Baixar Template"
  - Formatos aceitos: .xlsx, .csv
  - Instrucoes sobre campos

Step 2: PREVIEW
  - Resumo: X usuarios a criar
  - Tabela com preview dos primeiros 10
  - Avisos de validacao (emails duplicados, PDVs nao encontrados)
  - Opcoes: Ignorar duplicados

Step 3: PROCESSING
  - Barra de progresso
  - Contador: X de Y processados
  - Animacao de loading

Step 4: RESULT
  - Resumo: X criados, Y erros
  - Lista de links de acesso gerados
  - Botao "Baixar Log de Erros" (se houver)
  - Botao "Baixar Links de Acesso" (CSV com links)
  - Botao "Concluir"
```

### Modelo de Template CSV

```csv
nome;email;perfil;pdv;modulos
Carlos Silva;carlos@empresa.com;gerente;Posto Centro;merchandising,media
Maria Santos;maria@empresa.com;diretor;;merchandising,media
Joao Ferreira;joao@empresa.com;gerente;Posto Sul;media
```

---

## Fase 4: Modificacao da Pagina de Usuarios

### Atualizar src/pages/Users.tsx

Header com dois botoes:

```text
[+ Novo Usuario]  [Importar CSV]
```

O botao "Importar CSV" abre o BulkUserImportDialog.

### Restricao de Acesso

Botao de importacao visivel apenas para `super_admin` e `admin`.

---

## Fase 5: Tratamento de Erros

### Validacoes Pre-Importacao

| Validacao | Mensagem |
|-----------|----------|
| Email vazio | "Linha X: Email obrigatorio" |
| Email invalido | "Linha X: Email invalido" |
| Email duplicado no arquivo | "Linha X: Email duplicado" |
| Perfil invalido | "Linha X: Perfil deve ser gerente, diretor, etc" |
| PDV nao encontrado | "Linha X: PDV 'Nome' nao encontrado" |
| Modulos vazios | "Linha X: Pelo menos um modulo obrigatorio" |

### Erros Durante Processamento

| Erro | Tratamento |
|------|------------|
| Email ja registrado | Registrar erro, continuar proximo |
| Erro na edge function | Registrar erro, continuar proximo |
| Timeout | Registrar erro, continuar proximo |

---

## Fase 6: Exportacao de Resultados

### Arquivo de Links de Acesso

Apos importacao bem-sucedida, gerar CSV com:

```csv
nome;email;perfil;link_acesso
Carlos Silva;carlos@empresa.com;gerente;https://gestao-e-marketing.lovable.app/acesso/abc123
Maria Santos;maria@empresa.com;diretor;https://gestao-e-marketing.lovable.app/acesso/xyz789
```

### Arquivo de Log de Erros

Para registros com falha:

```csv
linha;nome;email;erro
3;Joao Ferreira;joao@empresa.com;Email ja registrado no sistema
5;Ana Costa;ana@empresa.com;PDV 'Posto Inexistente' nao encontrado
```

---

## Detalhes Tecnicos

### Parsing de Excel com XLSX

```typescript
import * as XLSX from 'xlsx';

const parseExcelFile = async (file: File) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  return jsonData;
};
```

### Integracao com Edge Function Existente

Reutilizar a mesma logica do `useCreateUser`:

```typescript
const createUserResult = await supabase.functions.invoke('create-user', {
  body: {
    name: record.nome,
    email: record.email,
    role: record.perfil,
    modules: record.modulos,
    pdvId: pdvMatch?.id || undefined,
  },
});
```

### Mapeamento de PDVs

```typescript
// Buscar todos os PDVs uma vez antes de processar
const { data: pdvs } = await supabase
  .from('pdvs')
  .select('id, code, name');

// Mapear por nome (case-insensitive)
const pdvMap = new Map(pdvs.map(p => [p.name.toLowerCase(), p.id]));

// Encontrar PDV pelo nome na planilha
const pdvId = pdvMap.get(record.pdv?.toLowerCase());
```

---

## Interface Final

### Botao na Pagina de Usuarios

```
[+ Novo Usuario]  [Importar CSV]
```

### Dialog de Importacao

- Largura: max-w-3xl
- Altura: max-h-[90vh] com scroll
- Seguir design do BulkImportDialog existente
- Cores e icones consistentes com o sistema

---

## Ordem de Implementacao

1. Criar `useBulkUserImport.ts` (hook completo com parsing, validacao e processamento)
2. Criar `BulkUserImportDialog.tsx` (4 steps: upload, preview, processing, result)
3. Atualizar `Users.tsx` (adicionar botao e importar dialog)
4. Testar com arquivo de exemplo

---

## Resultado Esperado

1. Botao "Importar" disponivel na pagina /users para Super Admin
2. Template CSV/Excel para download com campos corretos
3. Validacao de dados antes da importacao
4. Processamento com barra de progresso
5. Exportacao de links de acesso gerados
6. Log de erros para registros que falharam

Todos os usuarios criados via importacao receberao links de acesso pessoais (exceto super_admin que recebe senha temporaria).
