import { useMemo } from 'react';
import { useOperationalCosts, useRegionalCosts } from './useOperationalCosts';
import { useSupplierPricing } from './useSupplierPricing';
import { calcularEstimativaCompleta, CostBreakdown } from '@/lib/costCalculator';
import { filtrarCustosPorPerfil, VisibleCostData, CostVisibilityContext } from '@/lib/costVisibility';
import { useAuth } from '@/contexts/AuthContext';

interface UseCostEstimateParams {
  supplierId?: string;
  serviceType?: string;
  area?: number;
  distancia?: number;
  estado?: string;
  duracaoDias?: number;
}

interface UseCostEstimateResult {
  isLoading: boolean;
  costBreakdown: CostBreakdown | null;
  visibleCosts: VisibleCostData;
  error: Error | null;
}

export function useCostEstimate(params: UseCostEstimateParams): UseCostEstimateResult {
  const { profile } = useAuth();
  const { data: operationalCosts = [], isLoading: loadingOperational, error: errorOperational } = useOperationalCosts();
  const { data: regionalCosts = [], isLoading: loadingRegional, error: errorRegional } = useRegionalCosts();
  const { data: supplierPricing = [], isLoading: loadingPricing, error: errorPricing } = useSupplierPricing(params.supplierId);

  const isLoading = loadingOperational || loadingRegional || loadingPricing;
  const error = errorOperational || errorRegional || errorPricing;

  const costBreakdown = useMemo(() => {
    if (
      isLoading ||
      !params.supplierId ||
      !params.serviceType ||
      params.area === undefined ||
      params.distancia === undefined ||
      !params.estado
    ) {
      return null;
    }

    return calcularEstimativaCompleta({
      area: params.area,
      distancia: params.distancia,
      estado: params.estado,
      serviceType: params.serviceType,
      supplierPricing,
      operationalCosts,
      regionalCosts,
      duracaoDias: params.duracaoDias,
    });
  }, [
    isLoading,
    params.supplierId,
    params.serviceType,
    params.area,
    params.distancia,
    params.estado,
    params.duracaoDias,
    supplierPricing,
    operationalCosts,
    regionalCosts,
  ]);

  const visibleCosts = useMemo(() => {
    const role = profile?.role || 'collaborator';
    // Could add context for alerts here
    const context: CostVisibilityContext = {
      // These could be fetched from stats
      mediaServico: undefined,
      orcamentoMensal: undefined,
      gastoAtualMes: undefined,
    };
    return filtrarCustosPorPerfil(costBreakdown, role, context);
  }, [costBreakdown, profile?.role]);

  return {
    isLoading,
    costBreakdown,
    visibleCosts,
    error: error as Error | null,
  };
}

// Hook to get all pricing data for display/management
export function useAllSupplierPricing() {
  return useSupplierPricing();
}
