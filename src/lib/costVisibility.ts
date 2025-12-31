import { CostBreakdown, formatCurrency } from './costCalculator';

export type UserRole = 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier' | 'coordenador_compras';

export interface VisibleCostData {
  showFullDetails: boolean;
  showTotalOnly: boolean;
  showAlerts: boolean;
  showKPIs: boolean;
  total_estimado: number | null;
  custo_fornecedor: number | null;
  custos_operacionais: number | null;
  multiplicador_regional: number | null;
  detalhamento: CostBreakdown['detalhamento'] | null;
  mensagem: string;
  alertas: CostAlert[];
}

export interface CostAlert {
  type: 'warning' | 'success' | 'error';
  message: string;
}

export interface CostVisibilityContext {
  mediaServico?: number; // média de custo para o tipo de serviço
  orcamentoMensal?: number; // orçamento mensal da região
  gastoAtualMes?: number; // gasto atual no mês para a região
}

export function filtrarCustosPorPerfil(
  dadosCompletos: CostBreakdown | null,
  perfilUsuario: UserRole,
  context?: CostVisibilityContext
): VisibleCostData {
  // Default response for no data
  if (!dadosCompletos) {
    return {
      showFullDetails: false,
      showTotalOnly: false,
      showAlerts: false,
      showKPIs: false,
      total_estimado: null,
      custo_fornecedor: null,
      custos_operacionais: null,
      multiplicador_regional: null,
      detalhamento: null,
      mensagem: 'Estimativa não disponível',
      alertas: [],
    };
  }

  const alertas = gerarAlertas(dadosCompletos, context);

  switch (perfilUsuario) {
    case 'super_admin':
      return {
        showFullDetails: true,
        showTotalOnly: false,
        showAlerts: true,
        showKPIs: true,
        total_estimado: dadosCompletos.total_estimado,
        custo_fornecedor: dadosCompletos.custo_fornecedor,
        custos_operacionais: dadosCompletos.custos_operacionais,
        multiplicador_regional: dadosCompletos.multiplicador_regional,
        detalhamento: dadosCompletos.detalhamento,
        mensagem: 'Detalhamento completo do custo',
        alertas,
      };

    case 'director':
      return {
        showFullDetails: false,
        showTotalOnly: true,
        showAlerts: true,
        showKPIs: true,
        total_estimado: dadosCompletos.total_estimado,
        custo_fornecedor: dadosCompletos.custo_fornecedor,
        custos_operacionais: null,
        multiplicador_regional: dadosCompletos.multiplicador_regional,
        detalhamento: null,
        mensagem: 'Investimento total estimado para aprovação',
        alertas,
      };

    case 'admin':
      return {
        showFullDetails: true,
        showTotalOnly: false,
        showAlerts: true,
        showKPIs: true,
        total_estimado: dadosCompletos.total_estimado,
        custo_fornecedor: dadosCompletos.custo_fornecedor,
        custos_operacionais: dadosCompletos.custos_operacionais,
        multiplicador_regional: dadosCompletos.multiplicador_regional,
        detalhamento: dadosCompletos.detalhamento,
        mensagem: 'Detalhamento completo do custo',
        alertas,
      };

    case 'manager':
      return {
        showFullDetails: false,
        showTotalOnly: true,
        showAlerts: false,
        showKPIs: false,
        total_estimado: dadosCompletos.total_estimado,
        custo_fornecedor: null,
        custos_operacionais: null,
        multiplicador_regional: null,
        detalhamento: null,
        mensagem: 'Valor estimado aprovado para este serviço',
        alertas: [],
      };

    case 'collaborator':
    case 'supplier':
    default:
      return {
        showFullDetails: false,
        showTotalOnly: false,
        showAlerts: false,
        showKPIs: false,
        total_estimado: null,
        custo_fornecedor: null,
        custos_operacionais: null,
        multiplicador_regional: null,
        detalhamento: null,
        mensagem: 'Informação restrita',
        alertas: [],
      };
  }
}

function gerarAlertas(
  dados: CostBreakdown,
  context?: CostVisibilityContext
): CostAlert[] {
  const alertas: CostAlert[] = [];

  // Alerta: custo acima da média
  if (context?.mediaServico && dados.total_estimado > context.mediaServico * 1.15) {
    const percentAcima = Math.round(((dados.total_estimado / context.mediaServico) - 1) * 100);
    alertas.push({
      type: 'warning',
      message: `${percentAcima}% acima da média para este tipo de serviço (${formatCurrency(context.mediaServico)})`,
    });
  }

  // Alerta: dentro do orçamento
  if (context?.orcamentoMensal && context?.gastoAtualMes !== undefined) {
    const gastoAposServico = context.gastoAtualMes + dados.total_estimado;
    if (gastoAposServico <= context.orcamentoMensal) {
      alertas.push({
        type: 'success',
        message: 'Dentro do orçamento mensal para a região',
      });
    } else {
      alertas.push({
        type: 'error',
        message: `Ultrapassará o orçamento mensal em ${formatCurrency(gastoAposServico - context.orcamentoMensal)}`,
      });
    }
  }

  // Alerta: custo muito acima da média (outlier)
  if (context?.mediaServico && dados.total_estimado > context.mediaServico * 1.5) {
    alertas.push({
      type: 'error',
      message: 'Custo atípico detectado - revisar estimativa',
    });
  }

  return alertas;
}

// Check if user can see costs
export function canSeeCosts(role: UserRole): boolean {
  return ['super_admin', 'admin', 'director'].includes(role);
}

// Check if user can see full cost details
export function canSeeFullCostDetails(role: UserRole): boolean {
  return ['super_admin', 'admin'].includes(role);
}

// Check if user can configure costs
export function canConfigureCosts(role: UserRole): boolean {
  return role === 'super_admin';
}
