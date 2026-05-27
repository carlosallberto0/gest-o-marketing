
# Módulo Mapa da Rede

Portal **público (sem login)** em `/rede` que lista os postos da rede com filtros, KPIs e serviços oferecidos. Consome a tabela `pdvs` existente (fonte única da verdade) e adiciona apenas os campos/relações que faltam. Tudo respeitando o design system (tokens semânticos do `index.css` + `tailwind.config.ts` + componentes shadcn — nada de cores hardcoded).

## Princípios

- **Integração, não substituição** — usa `pdvs` direto; sem cadastro paralelo.
- **Acesso público** — rota `/rede` fora de `AppLayout`/`AuthContext`, leitura via `anon`.
- **Design system** — `bg-background`, `text-foreground`, `border-border`, `Card`, `Badge`, `Input`, `Select`, `Dialog` do shadcn. Sem `#3B82F6`, `--blue` ou cores cruas do HTML original. Tipografia segue a do sistema (não importar Inter de novo).
- **Categorias dinâmicas** — serviços virão de `system_options` (`tipo='servico_posto'`), gerenciados em Configurações > Opções do Sistema, padrão já existente.

## Banco de dados (1 migração)

1. **Adicionar colunas em `pdvs`** (opcionais, não quebram o existente):
   - `bandeira TEXT` (Shell, BR, Ipiranga, Branca…)
   - `cnpj TEXT`
   - `phone TEXT`
2. **Nova tabela `pdv_servicos`** (N:N pdv ↔ chave de serviço):
   - `pdv_id UUID FK → pdvs(id) ON DELETE CASCADE`
   - `servico_key TEXT` (referencia `system_options.value` do tipo `servico_posto`)
   - PK composta (`pdv_id`, `servico_key`)
   - Índice por `pdv_id`
3. **GRANTs + RLS**:
   - `GRANT SELECT ON pdvs TO anon` (apenas SELECT — já tinha para authenticated)
   - `GRANT SELECT ON pdv_servicos TO anon, authenticated; GRANT ALL TO service_role`
   - Política pública de SELECT em `pdv_servicos` (e SELECT pública em `pdvs` já filtrada apenas para campos seguros).
4. **Seed inicial** em `system_options` com as 9 categorias do HTML (Troca de Óleo, Conveniência, Loja de Acessórios, Restaurante, Lanchonete, Lava Jato, Banheiro c/ Chuveiro, Borracharia, Calibrador de Pneus).

> Observação de segurança: a página pública não exibirá `manager_id`, telefone do gerente nem `id_importacao`. O hook público fará `select` somente das colunas seguras.

## Rotas

- `/rede` — pública, lista + filtros + KPIs (não passa por `AppLayout`, `RequireRole` nem `ModuleSelection`).
- `/mapa-da-rede/dashboard` — admin (Super Admin), com:
  - Gestão de **bandeira / CNPJ / telefone / serviços** por posto (edita `pdvs` + `pdv_servicos`).
  - Atalho para Configurações > Opções do Sistema (categorias).

Adicionar card "Mapa da Rede" em `ModuleSelection` (somente Super Admin), seguindo `ModuleCard` existente, ícone `Network`/`Map`.

## Frontend — arquivos novos

```text
src/pages/rede/
  PublicNetworkPortal.tsx     # /rede — layout próprio, header simples + footer
  components/
    NetworkKPIs.tsx           # 4 cards (total, bandeiras, com conveniência, com lava jato)
    NetworkFilters.tsx        # busca + select bandeira + select estado + chips serviço
    NetworkGrid.tsx           # cards de posto (view grid)
    NetworkTable.tsx          # view tabela
    PdvDetailDialog.tsx       # modal com info + serviços
    ShareDialog.tsx           # seleção + texto + WhatsApp/copiar

src/pages/mapa-da-rede/
  DashboardMapaRede.tsx       # admin: tabela editável de bandeira/CNPJ/serviços por PDV
  EditPdvServicesDialog.tsx   # marca serviços do PDV

src/hooks/
  usePublicNetwork.ts         # query pública: pdvs ativos + serviços agregados
  usePdvServices.ts           # CRUD pivot pdv_servicos (admin)
```

Adicionar em `ModuleContext`: incluir `'mapa-da-rede'` no tipo `ActiveModule`.

## SEO / WhatsApp preview

- Título: "Rede de Postos — Gestão & Marketing".
- Meta description com nº de postos + cidades atendidas.
- OpenGraph + JSON-LD (`ItemList` de `GasStation`) para indexação.

## Pontos fora de escopo (não fazer agora)

- Mapa interativo (Mapbox) — usuário escolheu lista + filtros.
- Edição pública / login no portal.
- Geração automática de bandeira a partir de outro dado.

## Resumo técnico (para o time)

| Item | Decisão |
|---|---|
| Fonte de postos | `pdvs` (sem duplicar cadastro) |
| Campos novos em `pdvs` | `bandeira`, `cnpj`, `phone` |
| Serviços | tabela pivot `pdv_servicos` + `system_options.tipo='servico_posto'` |
| Acesso público | `GRANT SELECT … TO anon` + RLS pública restrita a colunas seguras |
| Rota pública | `/rede` |
| Rota admin | `/mapa-da-rede/dashboard` (Super Admin) |
| Design | tokens do sistema; sem cores cruas; shadcn + Nazox |
