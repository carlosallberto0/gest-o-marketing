import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface FinancialStats {
  investimentoMensal: number;
  investimentoMesAnterior: number;
  variacaoMensal: number;
  custoMedioOutdoor: number;
  totalServicosAtipicos: number;
  distribuicaoRegional: { estado: string; valor: number; quantidade: number }[];
  topFornecedores: { name: string; valor: number; quantidade: number }[];
  servicosPorTipo: { tipo: string; quantidade: number; valorTotal: number }[];
}

export function useFinancialStats() {
  return useQuery({
    queryKey: ['financial-stats'],
    queryFn: async (): Promise<FinancialStats> => {
      const now = new Date();
      const inicioMes = startOfMonth(now);
      const fimMes = endOfMonth(now);
      const inicioMesAnterior = startOfMonth(subMonths(now, 1));
      const fimMesAnterior = endOfMonth(subMonths(now, 1));

      // Fetch service orders with related data
      const { data: ordersThisMonth, error: error1 } = await supabase
        .from('service_orders')
        .select(`
          id,
          total_cost,
          custo_fornecedor,
          custos_operacionais,
          type,
          created_at,
          supplier_id,
          suppliers!inner(name),
          outdoor_id,
          outdoors!inner(id, pdv_id, pdvs!inner(state))
        `)
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString());

      if (error1) throw error1;

      const { data: ordersLastMonth, error: error2 } = await supabase
        .from('service_orders')
        .select('id, total_cost')
        .gte('created_at', inicioMesAnterior.toISOString())
        .lte('created_at', fimMesAnterior.toISOString());

      if (error2) throw error2;

      // Calculate stats
      const investimentoMensal = ordersThisMonth?.reduce((sum, o) => sum + (o.total_cost || 0), 0) || 0;
      const investimentoMesAnterior = ordersLastMonth?.reduce((sum, o) => sum + (o.total_cost || 0), 0) || 0;
      const variacaoMensal = investimentoMesAnterior > 0 
        ? ((investimentoMensal - investimentoMesAnterior) / investimentoMesAnterior) * 100 
        : 0;

      const totalOrders = ordersThisMonth?.length || 0;
      const custoMedioOutdoor = totalOrders > 0 ? investimentoMensal / totalOrders : 0;

      // Count atypical services (>150% of average)
      const totalServicosAtipicos = ordersThisMonth?.filter(
        o => o.total_cost > custoMedioOutdoor * 1.5
      ).length || 0;

      // Group by region (state)
      const regionalMap = new Map<string, { valor: number; quantidade: number }>();
      ordersThisMonth?.forEach(order => {
        const state = (order.outdoors as any)?.pdvs?.state || 'N/A';
        const existing = regionalMap.get(state) || { valor: 0, quantidade: 0 };
        regionalMap.set(state, {
          valor: existing.valor + (order.total_cost || 0),
          quantidade: existing.quantidade + 1,
        });
      });
      const distribuicaoRegional = Array.from(regionalMap.entries())
        .map(([estado, data]) => ({ estado, ...data }))
        .sort((a, b) => b.valor - a.valor);

      // Group by supplier
      const supplierMap = new Map<string, { valor: number; quantidade: number }>();
      ordersThisMonth?.forEach(order => {
        const supplierName = (order.suppliers as any)?.name || 'Desconhecido';
        const existing = supplierMap.get(supplierName) || { valor: 0, quantidade: 0 };
        supplierMap.set(supplierName, {
          valor: existing.valor + (order.total_cost || 0),
          quantidade: existing.quantidade + 1,
        });
      });
      const topFornecedores = Array.from(supplierMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Group by service type
      const typeMap = new Map<string, { quantidade: number; valorTotal: number }>();
      ordersThisMonth?.forEach(order => {
        const tipo = order.type || 'outro';
        const existing = typeMap.get(tipo) || { quantidade: 0, valorTotal: 0 };
        typeMap.set(tipo, {
          quantidade: existing.quantidade + 1,
          valorTotal: existing.valorTotal + (order.total_cost || 0),
        });
      });
      const servicosPorTipo = Array.from(typeMap.entries())
        .map(([tipo, data]) => ({ tipo, ...data }))
        .sort((a, b) => b.valorTotal - a.valorTotal);

      return {
        investimentoMensal,
        investimentoMesAnterior,
        variacaoMensal,
        custoMedioOutdoor,
        totalServicosAtipicos,
        distribuicaoRegional,
        topFornecedores,
        servicosPorTipo,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Labels for service types in Portuguese
export const serviceTypeLabels: Record<string, string> = {
  installation: 'Instalação',
  maintenance: 'Manutenção',
  removal: 'Remoção',
  replacement: 'Substituição',
};
