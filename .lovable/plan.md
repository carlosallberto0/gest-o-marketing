

# Remover "Gerar Ordem de Serviço" e Integrar Atribuição Pós-Diretoria

## Justificativa

A página "Gerar Ordem de Serviço" é um passo intermediário desnecessário. Os dois caminhos já cobrem o fluxo sem ela:

```text
Caminho Direto:     Solicitação → Super Admin atribui fornecedor → Painel Fornecedor ✅
Caminho Escalado:   Solicitação → Diretoria aprova → ??? → Fornecedor
                                                      ↑
                                          Hoje: Super Admin vai em "Gerar OS"
                                          Proposta: Super Admin atribui fornecedor
                                                    direto na aba de pacotes aprovados
```

## Alterações

### 1. Tela "Aprovar Manutenção" — Aba de pacotes aprovados (`MaintenanceApproval.tsx`)

Quando o diretor marca um pacote como "pronto para OS" (`ready_for_service_order = true`), esse pacote aparece na aba de histórico/aprovados. Para o **Super Admin**, adicionar um botão **"Atribuir Fornecedor"** nos pacotes com `ready_for_service_order = true` que ainda não possuem fornecedor atribuído. Ao clicar, abre o `AssignSupplierDialog` (ou equivalente) com os itens aprovados do pacote.

### 2. Remover a página e rota (`App.tsx`, `AppLayout.tsx`)

- Remover rota `/generate-service-order` de `App.tsx`
- Remover import de `GenerateServiceOrder`
- Remover item "Gerar Ordem de Serviço" do sidebar em `AppLayout.tsx`

### 3. Arquivo `GenerateServiceOrder.tsx` — manter no projeto (não deletar)

O arquivo não será deletado para evitar perda acidental, mas ficará sem rota e sem entrada no menu — efetivamente desativado.

### Arquivos a editar
- `src/pages/MaintenanceApproval.tsx` — adicionar botão "Atribuir Fornecedor" em pacotes aprovados pela diretoria (visível só para super_admin)
- `src/components/layout/AppLayout.tsx` — remover item "Gerar Ordem de Serviço" do menu
- `src/App.tsx` — remover rota `/generate-service-order`

