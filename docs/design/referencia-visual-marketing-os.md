# Referência visual do Marketing OS novo

> Fonte: `referencia-visual-marketing-os.png`, fornecida pelo usuário em 2026-09-08. Substitui a identidade "Nazox" do sistema antigo (`MARKETING-OS-DESIGN-SYSTEM.md`) como referência visual do sistema novo — não é uma variação dela.

## Leitura da referência

**Paleta e superfícies:**
- Azul de marca mais saturado que o azul Nazox (`hsl(230 76% 63%)`), usado em logo, item ativo da sidebar, botões primários e barra de progresso mobile.
- **Sidebar clara** (branca), item ativo em fundo azul claro com texto azul — inverte a regra do sistema antigo ("sidebar sempre escura").
- Fundo geral cinza muito claro, cards brancos.

**Forma:**
- Radius moderado, maior que o `0.25rem` da Nazox — cards, botões e KPIs com cantos arredondados visíveis, não quase retos.
- Sombra suave em cards (mesmo princípio de "profundidade sutil" da Nazox, valores a recalibrar).
- KPI card com ícone dentro de círculo colorido (laranja, roxo, azul, rosa) — padrão não usado dessa forma no sistema antigo.
- Badge de status como pílula colorida (ex.: "Aprovação" vermelho/rosa, "Criação" laranja, "Em aberto"/"Em produção" roxo/azul).

**Tipografia:** sans-serif geométrica neutra — fonte exata não identificável a partir da imagem; decisão de implementação em aberto.

## Arquitetura de produto revelada pela imagem

- **Sidebar principal:** Dashboard, Estúdio, Aprovações, Central Criativa, Biblioteca, Campanhas, Outdoor, Relatórios, Configurações — bate com os módulos do `Marketing_OS_Backlog_v2.md` (Estúdio/Aprovações/Central Criativa/Biblioteca), mas mostra **Campanhas** e **Outdoor** como itens de primeiro nível, não como sub-página de Merchandising/Mídia Externa como no sistema antigo.
- **Seletor de posto na sidebar** ("Posto selecionado: Posto São Roque – Matriz") — confirma o escopo por PDV como elemento central de navegação, não só de RLS.
- **Fluxo mobile do Estúdio** bate exatamente com o Backlog v2: escolher canal → template → composição → revisão/exportação (PNG/JPG/PDF) → sucesso.
- Merchandising e Análise Estratégica não aparecem nesta tela — provavelmente porque é a visão do papel "Marketing" (usuária "Mariana Costa"), não a visão completa de admin. Não presumir que esses módulos saem do escopo só por ausência nesta imagem.

## Status

Registrado como referência definitiva de interface para quando o roadmap chegar à fase de UI de cada módulo (ver `docs/NOVO-MARKETING-OS-ESPECIFICACAO.md`, seção I). Nenhum token de design foi ainda extraído em código — decisão de implementação (fonte exata, valores de radius/sombra em `rem`, paleta completa por token semântico) fica para quando a Fase de UI de cada módulo for iniciada.
