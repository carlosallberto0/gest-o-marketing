# Referência visual do Marketing OS novo

> Fonte original: `referencia-visual-marketing-os.png`, fornecida pelo usuário em 2026-09-08. Substitui a identidade "Nazox" do sistema antigo (`MARKETING-OS-DESIGN-SYSTEM.md`) como referência visual do sistema novo — não é uma variação dela.
> Atualização 2026-09-17: usuário reenviou a mesma direção visual em versão mais completa — `referencia-visual-marketing-os-v2-completa.png` (pôster inteiro, com painel de Design System explícito) e `referencia-dashboard-closeup.png` (close-up do Dashboard). Estas duas substituem a leitura anterior nos pontos em que há informação nova e mais precisa (tipografia nomeada, paleta de cor com swatches); onde não há conflito, a leitura de 2026-09-08 permanece válida.

## Leitura da referência

**Paleta e superfícies:**
- Azul de marca mais saturado que o azul Nazox (`hsl(230 76% 63%)`), usado em logo, item ativo da sidebar, botões primários e barra de progresso mobile.
- **Sidebar clara** (branca), item ativo em fundo azul claro com texto azul — inverte a regra do sistema antigo ("sidebar sempre escura").
- Fundo geral cinza muito claro, cards brancos.
- **Painel "Design System" do pôster (novo, 2026-09-17) mostra 6 swatches de cor lado a lado**, leitura visual (não pixel-exata — nenhuma ferramenta de conta-gotas foi usada, valores a confirmar/ajustar na implementação): azul-marinho/índigo bem escuro (tom do quadrado do logo "M"), azul médio saturado (o azul de marca já descrito acima), verde, amarelo/âmbar, laranja-avermelhado, e cinza neutro. Leitura consistente com os KPIs/badges já descritos (cores de categoria, não só de status).

**Forma:**
- Radius moderado, maior que o `0.25rem` da Nazox — cards, botões e KPIs com cantos arredondados visíveis, não quase retos.
- Sombra suave em cards (mesmo princípio de "profundidade sutil" da Nazox, valores a recalibrar).
- KPI card com ícone dentro de círculo colorido (laranja, roxo, azul, rosa) — padrão não usado dessa forma no sistema antigo.
- Badge de status como pílula colorida (ex.: "Aprovação" vermelho/rosa, "Criação" laranja, "Em aberto"/"Em produção" roxo/azul).
- **Ícones (painel Design System, novo):** estilo de linha (outline), traço fino e uniforme — exemplos no pôster: casa/home, "+", lápis/edição, pasta, check. Consistente com `lucide-react`, já usado no projeto — não implica trocar biblioteca de ícone.

**Tipografia:** **"Plus Jakarta Sans"**, nomeada explicitamente no painel de Design System do pôster de 2026-09-17 (rótulo "Tipografia" + amostra "Aa"). Isso substitui a leitura anterior ("sans-serif geométrica neutra, fonte exata não identificável") e também a recomendação provisória de DM Sans registrada em `docs/superpowers/plans/2026-09-15-fase1-ia-navegacao.md` (decisão D.3 daquela fase) — aquela decisão foi tomada sem esta referência mais completa. Plus Jakarta Sans não está instalada no projeto ainda (`@fontsource/dm-sans` está; `@fontsource/plus-jakarta-sans` não) — instalar é trabalho da Fase 2.

## Arquitetura de produto revelada pela imagem

- **Sidebar principal (papel "Marketing", usuária "Mariana Costa"):** Dashboard, Estúdio, Aprovações, Central Criativa, Biblioteca, Campanhas, Outdoor, Relatórios, Configurações — bate com os módulos do `Marketing_OS_Backlog_v2.md`, mas mostra **Campanhas** e **Outdoor** como itens de primeiro nível, não como sub-página de Merchandising/Mídia Externa como no sistema antigo.
- **Descrição de cada módulo, agora explícita no pôster (novo, 2026-09-17):** Dashboard "Visão geral e atividades"; Estúdio "Criação de peças e templates"; Aprovações "Fluxos de aprovação"; Central Criativa "Demandas e solicitações"; Biblioteca "Elementos e ativos de marca"; Campanhas "Gestão de campanhas"; Outdoor "Gestão de outdoors e ativos"; Configurações "Usuários, equipes e permissões".
- **⚠️ Conflito com decisão já tomada (D.1 da Fase 1):** esta referência mostra **Aprovações e Central Criativa (= Demandas Criativas) como dois módulos de navegação separados**, cada um com ícone e descrição próprios. A Fase 1 (`docs/design/DIAGNOSTICO-REDESIGN-FRONTEND.md`, seção D.1, aprovado 2026-09-15) decidiu o oposto: fundir os dois em **uma única tela com estados** ("Demanda gera Aprovação"). Esta referência não decide sozinha — é insumo visual, não uma nova decisão de produto — mas o conflito precisa ser resolvido explicitamente antes da Fase 6 (Marketing/Estúdio) do plano de implementação, que é quando essa fusão seria construída. Não presumir qual dos dois vence sem perguntar.
- **Seletor de posto na sidebar** ("Posto selecionado: Posto São Roque – Matriz") — presente na imagem original de 2026-09-08, **não aparece** no pôster de 2026-09-17 (o rodapé da sidebar mostra só o perfil "Mariana Costa / Marketing"). Não presumir que o seletor de posto foi removido da intenção do produto — mais provável que seja variação/corte do mock, não uma decisão de remover o escopo por PDV da navegação.
- **Fluxo mobile do Estúdio** bate exatamente com o Backlog v2: escolher canal → template → composição → revisão/exportação (PNG/JPG/PDF) → sucesso.
- Merchandising e Análise Estratégica não aparecem em nenhuma das duas versões — provavelmente porque é a visão do papel "Marketing", não a visão completa de admin. Não presumir que esses módulos saem do escopo só por ausência na imagem.

## Status

Registrado como referência definitiva de interface para quando o roadmap chegar à fase de UI de cada módulo (ver `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md`, seção I). Fonte tipográfica agora nomeada (Plus Jakarta Sans) e paleta de cor tem leitura visual de 6 swatches (ver acima) — valores exatos em `hsl`/`hex` por token semântico ficam para a implementação da Fase 2 (Design System), que pode (e deve) recalibrar por contraste/acessibilidade, não copiar pixel a pixel.
