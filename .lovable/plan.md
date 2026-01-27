

# Plano de Correcao: Preview/Capa do WhatsApp Nao Carrega

## Diagnostico do Problema

### Causa Raiz Identificada
A "capa" (preview) do link no WhatsApp nao esta carregando devido a **dois problemas** no `index.html`:

1. **URL da imagem com caracteres especiais mal formatados**: A meta tag `og:image` contem `&amp;` (entidade HTML) no nome do arquivo, mas os crawlers do WhatsApp esperam a URL pura ou codificada em URL-encoding (`%26`).

2. **Meta tag `og:url` ausente**: O WhatsApp precisa saber qual e a URL canonica do site para fazer o scraping correto das meta tags.

### URLs Atuais (Problematicas)
```
og:image: https://...social-1769533978054-capa_marketing_&amp;_gestão.jpg
```
O `&amp;` e interpretado literalmente como parte da URL, quebrando o link.

---

## Solucao Proposta

### Modificar: index.html

**Alteracoes necessarias:**

1. **Adicionar `og:url`** com o dominio canonico correto (`https://retail-rise-guide.lovable.app`)

2. **Corrigir URLs de imagem** removendo o `&amp;` e usando URL-encoding correto (`%26`) ou caracteres ASCII simples

3. **Adicionar fallback de imagem** com URL alternativa sem caracteres especiais (recomendado)

### Codigo Antes:
```html
<meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/4zP6jb2laCZiG3Updpb4nutitrQ2/social-images/social-1769533978054-capa_marketing_&amp;_gestão.jpg">
<meta name="twitter:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/4zP6jb2laCZiG3Updpb4nutitrQ2/social-images/social-1769533978054-capa_marketing_&amp;_gestão.jpg">
```

### Codigo Depois:
```html
<meta property="og:url" content="https://retail-rise-guide.lovable.app">
<meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/4zP6jb2laCZiG3Updpb4nutitrQ2/social-images/social-1769533978054-capa_marketing_%26_gest%C3%A3o.jpg">
<meta name="twitter:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/4zP6jb2laCZiG3Updpb4nutitrQ2/social-images/social-1769533978054-capa_marketing_%26_gest%C3%A3o.jpg">
```

**Explicacao dos URL-encodings:**
- `&` (E comercial) = `%26`
- `ã` (A com til) = `%C3%A3`

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `index.html` | Adicionar `og:url` com dominio canonico |
| `index.html` | Corrigir `og:image` com URL-encoding correto |
| `index.html` | Corrigir `twitter:image` com URL-encoding correto |

---

## Como Funciona o Preview do WhatsApp

Quando um usuario envia um link pelo WhatsApp, o servidor do WhatsApp faz uma requisicao HTTP para a URL e busca as seguintes meta tags:

1. `og:title` - Titulo exibido no preview
2. `og:description` - Descricao curta
3. `og:image` - Imagem de capa (1200x630px recomendado)
4. `og:url` - URL canonica

Se a imagem nao estiver acessivel ou a URL estiver mal formatada, o WhatsApp nao consegue gerar o preview.

---

## Impacto

- **Super Admin**: Nao afetado (esta correcao e apenas visual)
- **Links de Acesso**: Todos os links enviados via WhatsApp terao a capa/preview funcionando corretamente
- **Cache do WhatsApp**: Apos a correcao, pode levar alguns minutos para o WhatsApp atualizar o cache. Voce pode forcar a atualizacao usando a ferramenta de debug do Facebook: https://developers.facebook.com/tools/debug/

---

## Ordem de Implementacao

1. Atualizar `index.html` com as correcoes de meta tags
2. Fazer deploy (publicar)
3. Testar enviando um link pelo WhatsApp
4. Se necessario, limpar cache no Facebook Debug Tool

