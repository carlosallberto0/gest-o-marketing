# Estúdio — Posição Livre Híbrida por Elemento — Design

## Contexto

Depois de aprovar e implementar o editor visual de áreas por arrastar/redimensionar
(`docs/superpowers/specs/2026-09-21-estudio-editor-visual-arrastar-redimensionar-design.md`,
Tasks 1-3 já comitadas), o usuário testou o resultado e trouxe uma frustração
mais funda: "o sistema não deixa o usuário montar a arte como deveria". O
Estúdio de Comunicação é, nas palavras do usuário, "o ponto chave do
projeto" — precisa "rodar de forma fluida".

Isso motivou revisitar a decisão anterior de "zona é obrigatória (trava)"
(o elemento não podia ser reposicionado/redimensionado depois de solto numa
área). Para calibrar o pedido, o usuário colou um texto genérico de
"editor gráfico interativo baseado em Canvas" (resize/rotação livre,
snap/guias, ordem Z manipulável, undo/redo, múltiplos formatos com DPI,
salvar composição como template, export PNG/JPG/PDF/SVG, biblioteca
Fabric.js/Konva.js). Esse texto foi tratado como referência de inspiração,
não como escopo — ver seção "Fora de escopo" abaixo para o paralelo
item a item feito com o usuário antes deste desenho.

**Decisão do usuário (aprovada nesta conversa):** modelo **híbrido por
elemento**. O admin decide, área por área, se ela continua travada (padrão,
comportamento já implementado) ou se vira "livre" — nesse caso, o
colaborador pode arrastar/redimensionar (escala uniforme, sem rotação) o
elemento já colocado ali, a partir da posição inicial da área.

## Objetivo

Resolver o problema real relatado (conteúdo real não encaixa bem numa área
de tamanho/posição fixos — nome de produto mais longo, imagem com
proporção diferente, elemento que merece mais destaque) dando ajuste fino
de posição/tamanho ao colaborador, sem reabrir o escopo do editor genérico
completo.

## Fora de escopo (não-objetivos, com o paralelo feito com o usuário)

Comparado item a item com o texto de referência que o usuário colou:

- **Rotação de elemento** — decisão explícita do usuário: "raramente
  necessária pra esse tipo de peça". Fica de fora; adicionar depois é 1
  coluna nova (`rotacao_graus`) sem impacto no que existe.
- **Múltiplos formatos com troca dinâmica sem perder elementos, DPI, área
  de corte** — o modelo atual (1 template = 1 canal + resolução fixa) não
  muda. Trocar de formato continua sendo escolher outro template.
- **Múltiplas instâncias do mesmo elemento numa composição** — cada área
  continua sendo 1 slot para 1 elemento (ou 1 texto). Não vira uma paleta
  livre de "colocar quantos elementos quiser em qualquer lugar".
- **Snap/guias de alinhamento** — não pedido, não desenhado.
- **Ordem Z manipulável pelo colaborador** — `z_index` continua definido
  pelo admin, por área, no template. O colaborador não decide o que fica
  na frente/atrás.
- **Duplicar/deletar/bloquear elemento livremente** — o colaborador troca o
  elemento de uma área (fluxo já existente) ou remove (já existente); não
  há "duplicar" nem "bloquear" um elemento solto.
- **Undo/redo** — não entrou no escopo desta rodada.
- **Salvar composição do colaborador como novo template** — isso daria ao
  colaborador um poder hoje exclusivo do admin (criar template); não foi
  pedido e é uma decisão de permissão maior, não discutida.
- **Exportação em JPG/PDF/SVG** — export continua só PNG, como já é.
- **Ajuste livre de área de TEXTO** (título, preço, descrição, CTA,
  informativo) — ver "Achado técnico" abaixo: o mecanismo de
  deslocamento/escala só existe pra elementos de imagem no algoritmo de
  export atual. Texto continua centralizado na área, sem ajuste — não foi
  pedido (o exemplo de frustração do usuário foi sobre imagem/proporção).
- **Trocar a stack para Fabric.js/Konva.js** — mantém DOM posicionado em
  percentual + Pointer Events nativo + canvas só pra rasterizar no export,
  a mesma arquitetura das Tasks 1-3. Nenhuma dependência nova.

## Achado técnico — o mecanismo já existe no schema, sem uso

`estudio_composicao_elementos` (migration `20260911140000_estudio_comunicacao.sql:366-374`)
já tem `deslocamento_x_px numeric not null default 0`, `deslocamento_y_px numeric not null default 0`,
`fator_escala numeric not null default 1 check (fator_escala > 0)` — colunas
criadas na Fase do Estúdio, **nunca expostas em nenhuma tela**, mas já lidas
pelo algoritmo de exportação:

```typescript
// src/pages/EstudioColaborador.tsx:190-204 (já implementado, não muda)
function desenharImagemNaArea(ctx, img, rect, deslocamentoXPx, deslocamentoYPx, fatorEscala) {
  const escalaBase = Math.min(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const largura = img.naturalWidth * escalaBase * fatorEscala;
  const altura = img.naturalHeight * escalaBase * fatorEscala;
  const x = rect.x + (rect.w - largura) / 2 + deslocamentoXPx;
  const y = rect.y + (rect.h - altura) / 2 + deslocamentoYPx;
  ctx.drawImage(img, x, y, largura, altura);
}
```

`rect` vem de `areaRectPx(area, canvas.width, canvas.height)`, onde
`canvas.width`/`canvas.height` = `template.largura_px`/`altura_px` — ou
seja, **`deslocamento_x_px`/`deslocamento_y_px` são pixels do template
final** (ex.: até 1080 numa peça 1080×1080), não pixels de tela.

`useSalvarComposicaoElemento` (`src/hooks/useEstudioComposicoes.ts:187-227`)
**já aceita** `deslocamento_x_px`/`deslocamento_y_px`/`fator_escala` como
input opcional, e já faz select-then-update-or-insert corretamente —
**zero mudança necessária neste hook**.

Conclusão prática: esta feature precisa de **1 coluna nova** (marcar a área
como livre) + **UI nova** nos dois lados — nenhuma mudança em mutation
existente, nenhuma mudança no algoritmo de export.

## Modelo de dados

Migration nova, 1 coluna:

```sql
alter table public.estudio_template_areas
  add column posicao_livre boolean not null default false;

comment on column public.estudio_template_areas.posicao_livre is
  'Se true, o colaborador pode arrastar/redimensionar (escala uniforme) o elemento dentro desta área a partir da posição inicial, usando estudio_composicao_elementos.deslocamento_x_px/y_px/fator_escala. Só tem efeito em áreas de imagem (desenharImagemNaArea) — áreas de texto ignoram este campo, centralizadas sempre.';
```

`false` (padrão) preserva o comportamento atual em todas as áreas já
existentes — nenhuma migração de dado necessária além da coluna.

## Componente 1 — Admin (`EstudioTemplates.tsx`)

No dialog de metadados da área (`AreaFormDialog`, já simplificado na Task 2
— só metadados, sem campos espaciais), adicionar um checkbox: "Permitir
ajuste de posição/tamanho pelo colaborador" — só habilitado/visível quando
`tipo` selecionado não é um tipo de texto (`isTipoTexto`). Se o admin trocar
o tipo pra um tipo de texto com o checkbox marcado, desmarcar
automaticamente (evita salvar `posicao_livre = true` numa área que o
export ignora).

`AreaFormValues` ganha `posicaoLivre: boolean`. `handleAreaSubmit` inclui
`posicao_livre: values.posicaoLivre` tanto no create quanto no update de
metadados (igual aos demais campos de metadados — `obrigatorio`,
`max_elementos` etc., que já viajam nos dois casos).

## Componente 2 — Colaborador (`EstudioColaborador.tsx`)

Em `AreaZona`, quando a área não é de texto, tem `posicao_livre = true` E já
tem um elemento preenchido (`composicaoElemento?.elemento_id`), a imagem
renderizada ganha:

- Um **handle de mover** (o próprio corpo da imagem, arrastável) —
  `pointerdown`/`pointermove`/`pointerup`, mesma técnica de
  `setPointerCapture` das Tasks 1-2.
- Um **handle de canto** (1 só, inferior direito — escala uniforme, não
  4 cantos independentes como no admin) pra redimensionar via
  `fator_escala`.

Conversão tela→template: a cada `pointermove`, o delta em CSS-px do
ponteiro é convertido pra pixel-do-template multiplicando pela razão
`template.largura_px / containerRect.width` (e o equivalente em altura —
como o container mantém `aspectRatio` igual ao do template, as duas razões
são iguais na prática, mas calcular as duas independentemente é mais
robusto a arredondamento). O resultado vira o novo
`deslocamento_x_px`/`deslocamento_y_px` (mover) ou `fator_escala` (resize,
clampado a um mínimo razoável, ex.: 0.2, pra não sumir o elemento).

Persiste no `pointerup` via `useSalvarComposicaoElemento` — mesma função já
usada hoje, só passando `deslocamento_x_px`/`deslocamento_y_px`/`fator_escala`
em vez de `elemento_id`/`valor_texto`. Erro na mutation → snap-back pro
último valor salvo + mensagem inline (`role="alert"`), mesmo padrão das
Tasks 1-3.

Se `posicao_livre = false` (padrão) ou a área é de texto, nada muda —
comportamento idêntico ao que já está em produção.

## Fluxo de dados

- Migration nova: `alter table estudio_template_areas add column
  posicao_livre boolean not null default false`.
- `EstudioTemplateArea` (tipo TypeScript, `src/hooks/useEstudioTemplates.ts`)
  ganha `posicao_livre: boolean`.
- `useCreateEstudioTemplateArea`/`useUpdateEstudioTemplateArea` ganham
  `posicao_livre?: boolean` no input (mesmo padrão dos demais campos
  opcionais de metadados já existentes).
- `useSalvarComposicaoElemento`: **nenhuma mudança** — já aceita os campos
  necessários.

## Tratamento de erro

Mesmo padrão das Tasks 1-3: mutation falha no fim do arrasto (mover ou
redimensionar) → reverte visualmente pro último `deslocamento`/`fator_escala`
salvo (snap-back) e mostra erro inline `role="alert"`. `fator_escala`
sempre clampado a um mínimo positivo antes de persistir (o `check
(fator_escala > 0)` do banco já impede zero/negativo, mas clampar no
cliente evita round-trip de erro por um valor absurdo durante o arrasto).

## Testes / verificação (sem framework de teste — CLAUDE.md)

Verificação manual, mesmo formato das Tasks 1-3:

**Admin:** marcar uma área de imagem como "posição livre", salvar,
reabrir — checkbox continua marcado. Marcar um tipo de texto com o
checkbox ligado → ao trocar pra tipo de texto, o checkbox desmarca sozinho.

**Colaborador:** numa área de imagem com `posicao_livre = true` e um
elemento já preenchido, arrastar o elemento pelo corpo → solta → recarrega
a página → posição persistiu. Puxar o handle de canto → elemento
cresce/encolhe mantendo proporção → solta → recarrega → persistiu.
Numa área SEM `posicao_livre` (padrão), confirmar que nenhum handle
aparece — comportamento idêntico ao de antes desta feature. Exportar a
peça → posição/escala ajustadas aparecem corretamente na imagem final
(confirma que `desenharImagemNaArea`, não tocado nesta feature, já honra
os valores).

## Riscos / pontos de atenção

- **Container responsivo**: a mesma observação já registrada na spec
  anterior — `getBoundingClientRect()` do container precisa ser lido a
  cada `pointermove` (não cacheado), porque o layout é responsivo.
- **`fator_escala` mínimo**: sem um piso (ex.: 0.2), o colaborador pode
  encolher o elemento até ficar invisível/impossível de pegar de novo —
  clampar no cliente durante o `pointermove`, não só no submit.
- **Handle de canto único**: como é escala uniforme (não largura/altura
  independentes), 1 handle no canto inferior direito basta — não replicar
  os 4 cantos do editor de área do admin, que é um caso diferente (lá é
  retângulo livre, aqui é escala proporcional de uma imagem já com
  `object-contain`).
