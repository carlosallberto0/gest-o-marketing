# PRD do Sistema — 5 Módulos

Gerar um documento PRD em Markdown (português BR), documentando **apenas o estado atual** do sistema, com detalhamento completo por módulo. Sem propostas de melhoria e sem alterações no código do sistema.

## Módulos cobertos

1. Configurações
2. Merchandising
3. Mídia Externa
4. Análise Estratégica
5. Loteamentos

## Estrutura do documento

**Parte 1 — Contexto geral**
- Visão do produto, público e objetivo de negócio
- Arquitetura (React + Vite + Tailwind + backend Lovable Cloud)
- Modelo de papéis (super_admin, admin, diretor, gerente, coord. compras, coord. conveniência, fornecedor)
- Autenticação: login tradicional para super admin, links de acesso por token para os demais
- Camadas de controle de acesso: RLS, feature flags, permissões por papel, menus de gerente/diretor
- Convenções transversais: notificações, auditoria, soft delete, opções dinâmicas de sistema

**Parte 2 — Um capítulo por módulo**, cada um com:
- Objetivo e usuários
- Mapa de telas e rotas
- Entidades e tabelas do banco envolvidas (campos-chave e relacionamentos)
- Regras de negócio e fluxos de status (incluindo o fluxo de manutenção/OS de Mídia Externa e o motor de clusterização da Análise Estratégica)
- Permissões por papel
- Integrações com outros módulos
- Estado de maturidade de cada área (ex.: Loteamentos hoje é essencialmente dashboard + tabelas de contratos, lançamentos e pagamentos)

**Parte 3 — Anexos**
- Glossário de termos do domínio
- Índice de rotas por módulo
- Índice de tabelas por módulo
- Instruções de leitura para um agente de IA (Claude): o que é fonte da verdade, o que não deve ser alterado, convenções obrigatórias

## Método

Levantamento direto do código e do banco: rotas em `App.tsx`, páginas e componentes de cada módulo, hooks de dados, layouts/menus, esquema das tabelas, políticas RLS e funções do banco. Nada será afirmado no PRD sem verificação prévia no código ou no banco.

## Entrega

Arquivo `PRD-Gestao-Marketing.md` em `/mnt/documents`, disponível para download. Nenhum arquivo do projeto será modificado.
