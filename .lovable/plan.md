

# Corrigir Calendário para Mostrar Apenas Demandas Pendentes

## Problema

O calendário puxa todas as avaliações com `avaliacao_valida_ate` dentro do mês, incluindo outdoors que já foram avaliados e estão operacionais. Avaliações expiradas de outdoors já verificados continuam aparecendo como eventos.

## Causa Raiz

A query de avaliações busca TODOS os outdoors com `avaliacao_valida_ate` no intervalo, sem considerar:
- Se o outdoor já está `operational` e a avaliação já expirou (já foi tratado)
- Se o outdoor está `pending_evaluation` (realmente precisa de atenção)

## Solução

Ajustar os filtros no hook `useCalendarEvents.ts`:

### 1. Avaliações expirando
Mostrar apenas outdoors que:
- Têm `avaliacao_valida_ate >= now()` (expiração futura/hoje — precisa de atenção)
- OU `status = 'pending_evaluation'` (realmente pendente, independente da data)

Outdoors `operational` com avaliação já expirada não aparecem mais.

### 2. Manutenção pendente
Manter o filtro `status = 'pending'` já existente (correto).

### 3. Fornecedores
Manter filtro por status ativo (correto).

## Arquivo
- **Editar**: `src/hooks/useCalendarEvents.ts` — ajustar query de avaliações (seção 1, linhas ~56-89)

