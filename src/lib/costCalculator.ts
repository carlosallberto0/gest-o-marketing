import { OperationalCost, getOperationalCostValue } from '@/hooks/useOperationalCosts';
import { SupplierPricing, getPricingForService } from '@/hooks/useSupplierPricing';
import { RegionalCost } from '@/hooks/useOperationalCosts';

export interface CostBreakdown {
  custo_fornecedor: number;
  custos_operacionais: number;
  multiplicador_regional: number;
  total_estimado: number;
  detalhamento: {
    fornecedor: {
      custo_base: number;
      custo_area: number;
      custo_mao_obra: number;
      total: number;
    };
    operacionais: {
      hospedagem: number;
      alimentacao: number;
      combustivel: number;
      estrutura: number;
      total: number;
    };
    regional: {
      estado: string;
      multiplicador: number;
    };
  };
}

export interface CostCalculationInput {
  area: number; // área do outdoor em m²
  distancia: number; // distância até o local em km
  estado: string; // UF do outdoor
  serviceType: string;
  supplierPricing: SupplierPricing[];
  operationalCosts: OperationalCost[];
  regionalCosts: RegionalCost[];
  duracaoDias?: number;
}

export function calcularEstimativaCompleta(input: CostCalculationInput): CostBreakdown {
  const {
    area,
    distancia,
    estado,
    serviceType,
    supplierPricing,
    operationalCosts,
    regionalCosts,
    duracaoDias = 1,
  } = input;

  // ============================================
  // CAMADA 1: CUSTO DO FORNECEDOR
  // ============================================
  const pricing = getPricingForService(supplierPricing, serviceType);
  
  const custoBase = pricing?.custo_base ?? 0;
  const custoPorM2 = pricing?.custo_por_m2 ?? 0;
  const custoHoraTrabalho = pricing?.custo_hora_trabalho ?? 0;
  const horasEstimadas = pricing?.tempo_estimado_horas ?? 4;

  const custoArea = area * custoPorM2;
  const custoMaoObra = horasEstimadas * custoHoraTrabalho;
  const custoFornecedor = custoBase + custoArea + custoMaoObra;

  // ============================================
  // CAMADA 2: CUSTOS OPERACIONAIS
  // ============================================
  const hospedagemDiaria = getOperationalCostValue(operationalCosts, 'hospedagem_diaria');
  const alimentacaoDiaria = getOperationalCostValue(operationalCosts, 'alimentacao_diaria');
  const custoPorKm = getOperationalCostValue(operationalCosts, 'custo_por_km');
  const distanciaMinHospedagem = getOperationalCostValue(operationalCosts, 'distancia_minima_hospedagem');
  const qtdTecnicos = getOperationalCostValue(operationalCosts, 'quantidade_tecnicos') || 2;
  const depreciacaoPerc = getOperationalCostValue(operationalCosts, 'depreciacao_equipamentos');
  const segurosPerc = getOperationalCostValue(operationalCosts, 'seguros_licencas');
  const contingenciaPerc = getOperationalCostValue(operationalCosts, 'margem_contingencia');

  // Hospedagem (se distância > mínimo)
  const custoHospedagem = distancia > distanciaMinHospedagem 
    ? hospedagemDiaria * duracaoDias * qtdTecnicos 
    : 0;

  // Alimentação
  const custoAlimentacao = alimentacaoDiaria * duracaoDias * qtdTecnicos;

  // Combustível (ida e volta)
  const custoCombustivel = distancia * 2 * custoPorKm;

  // Estrutura (percentuais sobre custo do fornecedor)
  const totalPercentuais = depreciacaoPerc + segurosPerc + contingenciaPerc;
  const custoEstrutura = custoFornecedor * (totalPercentuais / 100);

  const custosOperacionais = custoHospedagem + custoAlimentacao + custoCombustivel + custoEstrutura;

  // ============================================
  // CAMADA 3: MULTIPLICADOR REGIONAL
  // ============================================
  const regional = regionalCosts.find(r => r.estado === estado);
  const multiplicador = regional?.multiplicador ?? 1.0;

  const totalEstimado = (custoFornecedor + custosOperacionais) * multiplicador;

  return {
    custo_fornecedor: custoFornecedor,
    custos_operacionais: custosOperacionais,
    multiplicador_regional: multiplicador,
    total_estimado: totalEstimado,
    detalhamento: {
      fornecedor: {
        custo_base: custoBase,
        custo_area: custoArea,
        custo_mao_obra: custoMaoObra,
        total: custoFornecedor,
      },
      operacionais: {
        hospedagem: custoHospedagem,
        alimentacao: custoAlimentacao,
        combustivel: custoCombustivel,
        estrutura: custoEstrutura,
        total: custosOperacionais,
      },
      regional: {
        estado: estado,
        multiplicador: multiplicador,
      },
    },
  };
}

// Format currency for display
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
