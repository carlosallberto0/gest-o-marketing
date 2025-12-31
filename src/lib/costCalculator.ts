import { OperationalCost, getOperationalCostValue } from '@/hooks/useOperationalCosts';
import { SupplierPricing, getPricingForService } from '@/hooks/useSupplierPricing';
import { RegionalCost } from '@/hooks/useOperationalCosts';

export interface CostBreakdown {
  custo_fornecedor: number;
  custos_operacionais: number;
  multiplicador_regional: number;
  total_estimado: number;
  detalhamento: {
    material: {
      custo_lona: number;
      fonte: 'fornecedor' | 'global';
    };
    producao: {
      impressao_base: number;
      impressao_area: number;
      total: number;
      fonte: 'fornecedor' | 'global';
    };
    envio: {
      base: number;
      distancia: number;
      total: number;
      fonte: 'fornecedor' | 'global';
    };
    fornecedor: {
      custo_base: number;
      custo_area: number;
      custo_mao_obra: number;
      custo_construcao: number;
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

  const pricing = getPricingForService(supplierPricing, serviceType);
  
  // ============================================
  // CAMADA 1: CUSTO DE MATERIAL (LONA)
  // ============================================
  const custoM2LonaGlobal = getOperationalCostValue(operationalCosts, 'custo_m2_lona');
  
  // Se fornecedor inclui material, custo de lona = 0 (já está no preço do serviço)
  // Senão, usar custo global
  const incluiMaterial = pricing?.inclui_material ?? false;
  const custoLona = incluiMaterial ? 0 : area * custoM2LonaGlobal;
  const fonteMaterial = incluiMaterial ? 'fornecedor' : 'global';

  // ============================================
  // CAMADA 2: CUSTO DE PRODUÇÃO (IMPRESSÃO)
  // ============================================
  const impressaoBaseGlobal = getOperationalCostValue(operationalCosts, 'custo_impressao_base');
  const impressaoM2Global = getOperationalCostValue(operationalCosts, 'custo_impressao_m2');
  
  // Prioridade: fornecedor > global
  const usarImpressaoFornecedor = (pricing?.custo_impressao_m2 ?? 0) > 0;
  const impressaoM2 = usarImpressaoFornecedor 
    ? (pricing?.custo_impressao_m2 ?? 0) 
    : impressaoM2Global;
  const impressaoBase = usarImpressaoFornecedor ? 0 : impressaoBaseGlobal;
  
  const custoImpressaoArea = area * impressaoM2;
  const custoImpressaoTotal = impressaoBase + custoImpressaoArea;
  const fonteProducao = usarImpressaoFornecedor ? 'fornecedor' : 'global';

  // ============================================
  // CAMADA 3: CUSTO DE ENVIO
  // ============================================
  const envioBaseGlobal = getOperationalCostValue(operationalCosts, 'custo_envio_base');
  const envioKmGlobal = getOperationalCostValue(operationalCosts, 'custo_envio_km');
  
  // Prioridade: fornecedor > global
  const usarEnvioFornecedor = (pricing?.custo_envio_base ?? 0) > 0;
  const envioBase = usarEnvioFornecedor 
    ? (pricing?.custo_envio_base ?? 0) 
    : envioBaseGlobal;
  const envioKm = envioKmGlobal; // Sempre usa global para km
  
  const custoEnvioDistancia = distancia * envioKm;
  const custoEnvioTotal = envioBase + custoEnvioDistancia;
  const fonteEnvio = usarEnvioFornecedor ? 'fornecedor' : 'global';

  // ============================================
  // CAMADA 4: CUSTO DO FORNECEDOR (SERVIÇO)
  // ============================================
  const custoBase = pricing?.custo_base ?? 0;
  const custoPorM2 = pricing?.custo_por_m2 ?? 0;
  const custoHoraTrabalho = pricing?.custo_hora_trabalho ?? 0;
  const horasEstimadas = pricing?.tempo_estimado_horas ?? 4;

  // Custo de construção (apenas para instalação)
  const custoConstrucaoBase = serviceType === 'installation' ? (pricing?.custo_construcao_base ?? 0) : 0;
  const custoConstrucaoM2 = serviceType === 'installation' ? (pricing?.custo_construcao_m2 ?? 0) : 0;
  const custoConstrucao = custoConstrucaoBase + (area * custoConstrucaoM2);

  const custoArea = area * custoPorM2;
  const custoMaoObra = horasEstimadas * custoHoraTrabalho;
  const custoFornecedor = custoBase + custoArea + custoMaoObra + custoConstrucao;

  // ============================================
  // CAMADA 5: CUSTOS OPERACIONAIS
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
  // CAMADA 6: MULTIPLICADOR REGIONAL
  // ============================================
  const regional = regionalCosts.find(r => r.estado === estado);
  const multiplicador = regional?.multiplicador ?? 1.0;

  // ============================================
  // CÁLCULO FINAL
  // Total = (Material + Produção + Envio + Serviço + Operacionais) × Regional
  // ============================================
  const subtotal = custoLona + custoImpressaoTotal + custoEnvioTotal + custoFornecedor + custosOperacionais;
  const totalEstimado = subtotal * multiplicador;

  return {
    custo_fornecedor: custoFornecedor,
    custos_operacionais: custosOperacionais,
    multiplicador_regional: multiplicador,
    total_estimado: totalEstimado,
    detalhamento: {
      material: {
        custo_lona: custoLona,
        fonte: fonteMaterial,
      },
      producao: {
        impressao_base: impressaoBase,
        impressao_area: custoImpressaoArea,
        total: custoImpressaoTotal,
        fonte: fonteProducao,
      },
      envio: {
        base: envioBase,
        distancia: custoEnvioDistancia,
        total: custoEnvioTotal,
        fonte: fonteEnvio,
      },
      fornecedor: {
        custo_base: custoBase,
        custo_area: custoArea,
        custo_mao_obra: custoMaoObra,
        custo_construcao: custoConstrucao,
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
