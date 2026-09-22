# Estúdio — Fonte e Tamanho de Texto por Área — Design

## Contexto

Testando a peça montada (template "Arte de Preço - Geral"), o usuário viu que
título, preço, telefone e endereço precisam de controle de fonte e tamanho
— hoje isso é 100% automático: `desenharTextoNaArea`
(`src/pages/EstudioColaborador.tsx:170-184`) calcula o tamanho a partir da
altura da área (`rect.h * 0.6`, encolhendo até caber) e sempre usa
`"sans-serif"`, peso 600, sem nenhuma opção de ajuste. O próprio código já
tinha um comentário `ponytail:` prevendo isso: "Upgrade: expor fonte/cor por
área se isso virar problema real com templates de verdade."

**Decisões do usuário (aprovadas nesta conversa):**
- Configuração **por área** (não por tipo de campo global) — mesmo padrão já
  usado por `posicao_livre`.
- Tamanho é um **teto máximo**: o texto tenta usar o tamanho configurado, mas
  ainda encolhe automaticamente se o conteúdo real não couber (preserva a
  segurança do comportamento atual, só troca o ponto de partida do cálculo).
- 3 fontes disponíveis: **Montserrat**, **Baloo 2**, **Jost**.

**Achado de licenciamento (resolvido nesta conversa):** o usuário pediu
inicialmente "Futura" — confirmado por busca que é uma fonte comercial da
Monotype/URW, não disponível no Google Fonts nem em repositório aberto.
Substituída por **Jost**, a alternativa gratuita mais próxima visualmente
(~90% de semelhança, fonte geométrica). Montserrat e Baloo 2 já eram
gratuitas desde o pedido original.

## Objetivo

Dar ao admin controle de fonte e tamanho máximo por área de texto, mantendo
o encolhimento automático de segurança que já existe, sem quebrar nenhuma
área de texto já configurada (que continuam sem essas colunas preenchidas,
comportamento idêntico ao de hoje).

## Fora de escopo

- Cor de texto configurável — não pedido nesta rodada (o comentário
  `ponytail:` original mencionava "fonte/cor", mas o usuário só pediu
  fonte/tamanho agora; cor seguiria o mesmo padrão de coluna se pedida depois).
- Peso de fonte configurável (negrito/regular/etc.) — mantém sempre 600.
- Alinhamento de texto configurável — mantém sempre centralizado.
- Fontes além das 3 aprovadas — pode virar uma 4ª opção depois sem redesenho,
  só mais uma entrada no `CHECK` e no `<Select>`.
- Qualquer fonte comercial/licenciada (Futura de verdade) — decisão explícita
  de não seguir esse caminho nesta rodada.

## Achado técnico — canvas não carrega fonte web sozinho

Diferente de texto em DOM/CSS (que carrega a fonte automaticamente quando
precisa renderizar), `<canvas>` **não** dispara o carregamento de uma fonte
web só por `ctx.font = "600 40px Montserrat"` — se a fonte não estiver
previamente carregada no documento, o desenho usa silenciosamente a fonte
padrão do navegador, sem erro nem aviso. É preciso `await
document.fonts.load(...)` antes de desenhar.

Também confirmado: apesar do `MARKETING-OS-DESIGN-SYSTEM.md` dizer que a
Poppins do app é "carregada via `@import` do Google Fonts em
`index.css:1`", isso está desatualizado — `index.css:1` é só `@tailwind
base;`, e não existe nenhum `<link>` de stylesheet do Google Fonts em
`index.html` hoje (só os dois `<link rel="preconnect">`, sem o `<link
rel="stylesheet">` que efetivamente baixa a fonte). Não é escopo desta
tarefa corrigir a Poppins do app — só não repetir esse gap para as 3 fontes
novas, adicionando o `<link rel="stylesheet">` que falta.

## Modelo de dados

2 colunas novas em `estudio_template_areas`, migration aditiva:

```sql
alter table public.estudio_template_areas
  add column fonte text
    check (fonte is null or fonte in ('Montserrat', 'Baloo 2', 'Jost')),
  add column tamanho_fonte_px integer
    check (tamanho_fonte_px is null or tamanho_fonte_px > 0);
```

`null` nos dois (padrão, preenchimento de áreas já existentes) preserva o
comportamento atual exatamente como está — sem migração de dado.

## Componente 1 — Admin (`EstudioTemplates.tsx`)

No dialog de metadados da área, quando o tipo selecionado É de texto
(`isTipoTexto(tipo)`, o helper já existe no arquivo desde a Task 3 de
`posicao_livre`), aparecem 2 campos novos:
- **Fonte**: `<Select>` com "Padrão do sistema" (valor `null`), Montserrat,
  Baloo 2, Jost.
- **Tamanho máximo (px)**: `<Input type="number">`, opcional (vazio = `null`
  = comportamento automático atual).

Mesma lógica de `AreaFormValues`/`handleSubmit`/reset no `useEffect` que já
existe para `posicaoLivre` — os 2 campos novos só entram no objeto
`metadados` de `handleAreaSubmit` (viaja pros dois branches, create e
update, igual todo o resto).

## Componente 2 — Colaborador, prévia (`EstudioColaborador.tsx`, `AreaZona`)

O `<span>` que exibe o texto preenchido (e o `<Input>`/`<Textarea>` do modo
de edição) ganham `style` com `fontFamily`/`fontSize` vindos de
`area.fonte`/`area.tamanho_fonte_px` quando definidos. É uma aproximação —
o encolhimento automático de verdade só roda no canvas da exportação (fonte
da verdade), a prévia não replica a medição de texto do canvas.

## Componente 3 — Exportação (`desenharTextoNaArea`/`gerarImagemComposicao`)

`desenharTextoNaArea` ganha 2 parâmetros novos, com default que preserva o
comportamento atual byte a byte quando a área nunca configurou nada:

- `fonteCss: string` — resolvido a partir de `area.fonte` (mapeando `"Baloo
  2"` para `'"Baloo 2", sans-serif'` por causa do espaço no nome; `null` vira
  `"sans-serif"`, igual hoje).
- `tamanhoMaximoPx: number` — `area.tamanho_fonte_px ?? Math.floor(rect.h *
  0.6)` (o cálculo que já existe, agora só como fallback).

O laço de encolhimento (`while (fontSize > 8) { ... fontSize -= 2 }`)
continua idêntico, só troca o valor inicial de `fontSize`.

`gerarImagemComposicao` precisa `await document.fonts.load(...)` para as 3
fontes ANTES do laço de desenho das áreas — carrega sempre as 3, independente
de quais a composição usa de fato (custo desprezível, evita lógica
condicional de "quais fontes esta composição usa").

## Carregamento de fonte no navegador

`index.html` já tem os 2 `<link rel="preconnect">` do Google Fonts (usados
hoje só pela Poppins, que — achado registrado acima — na prática não tem o
`<link rel="stylesheet">` correspondente). Adicionar um `<link
rel="stylesheet">` novo, só para as 3 fontes desta feature:

```html
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&family=Jost:wght@300..700&family=Montserrat:wght@300..700&display=swap" rel="stylesheet">
```

Pesos incluem 600 (usado fixo no `ctx.font`) nas 3 famílias.

## Testes / verificação (sem framework de teste — CLAUDE.md)

**Admin:** criar/editar uma área de texto → aparecem os campos de fonte e
tamanho → escolher Montserrat, tamanho 60 → salvar → reabrir → valores
persistiram. Trocar o tipo pra uma área de imagem → os 2 campos desaparecem
(mesma UX de `posicao_livre`, mas invertida).

**Colaborador:** preencher a área de texto configurada → a prévia mostra
aproximadamente a fonte/tamanho escolhidos. Exportar a peça → abrir o PNG →
conferir visualmente que a fonte é a Montserrat de verdade (não a fonte
padrão do navegador) e que o tamanho bate com o configurado (ou encolheu, se
o texto real for mais longo que cabe). Testar as 3 fontes. Testar uma área
de texto que NUNCA configurou fonte/tamanho (área antiga) — continua
idêntica a antes desta feature.

## Riscos / pontos de atenção

- **`document.fonts.load()` pode falhar silenciosamente** se a rede estiver
  lenta/offline no momento do export — nesse caso o texto sai na fonte
  padrão do navegador em vez da configurada, sem erro visível ao usuário.
  Aceitável para esta rodada (mesma categoria de risco que qualquer asset
  carregado por URL neste módulo); não vale complexidade de retry agora.
- **Nome com espaço** (`"Baloo 2"`) precisa de aspas dentro do valor de
  `ctx.font`/`font-family` CSS — sem isso o navegador interpreta como duas
  fontes separadas ("Baloo" e "2") e cai no fallback.
