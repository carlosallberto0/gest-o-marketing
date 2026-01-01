// =============== SCORE HELPER FUNCTIONS ===============
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success';
  if (score >= 75) return 'text-emerald-500';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-success';
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 60) return 'bg-warning';
  return 'bg-destructive';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 75) return 'Bom';
  if (score >= 60) return 'Regular';
  return 'Crítico';
}

// =============== STATUS HELPER FUNCTIONS ===============
export function getStatusColor(status: string): string {
  switch (status) {
    case 'operational':
    case 'active':
    case 'completed':
    case 'approved':
      return 'bg-success text-success-foreground';
    case 'pending':
    case 'pending_evaluation':
    case 'expiring':
    case 'in_progress':
      return 'bg-warning text-warning-foreground';
    case 'non_operational':
    case 'expired':
    case 'cancelled':
    case 'inactive':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    operational: 'Operacional',
    non_operational: 'Não Operacional',
    pending_evaluation: 'Aguardando Avaliação',
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente',
    approved: 'Aprovado',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    expiring: 'Próximo ao Vencimento',
    expired: 'Vencido',
    draft: 'Rascunho',
    ended: 'Encerrada',
  };
  return labels[status] || status;
}

// =============== ROLE HELPER FUNCTIONS ===============
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Administrador',
    admin: 'Administrador',
    director: 'Diretoria',
    manager: 'Gerente',
    collaborator: 'Colaborador',
    supplier: 'Fornecedor',
    coordenador_compras: 'Coordenador de Compras',
    convenience_coordinator: 'Coordenador de Conveniência',
  };
  return labels[role] || role;
}

// =============== CAMPAIGN HELPER FUNCTIONS ===============
export function getCampaignTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    promotional: 'Promocional',
    institutional: 'Institucional',
    seasonal: 'Sazonal',
    launch: 'Lançamento',
    partnership: 'Parceria',
  };
  return labels[type] || type;
}

export function getCampaignStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Rascunho';
    case 'active': return 'Ativa';
    case 'ended': return 'Encerrada';
    default: return status;
  }
}

export function getCampaignStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-muted text-muted-foreground';
    case 'active': return 'bg-success/10 text-success border-success/20';
    case 'ended': return 'bg-secondary text-secondary-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}
