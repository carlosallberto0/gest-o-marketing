import { 
  User, PDV, Outdoor, Contract, ServiceOrder, 
  MonthlyMediaEvaluation, ChecklistCategory, MerchEvaluation,
  TradeMaterial, Campaign, Supplier, SystemAlert 
} from '@/types';

// =============== USERS ===============
export const mockUsers: User[] = [
  { 
    id: '1', 
    name: 'Ricardo Super Admin', 
    email: 'super@srofftrademarketing.com', 
    cpf: '123.456.789-00',
    role: 'super_admin',
    modules: ['media', 'merchandising'],
    permissions: {
      canManageOutdoors: true,
      canManageContracts: true,
      canManageSuppliers: true,
      canApproveServiceOrders: true,
      canViewFinancials: true,
      canManageChecklists: true,
      canManageQuestions: true,
      canManageCategories: true,
      canManageMaterials: true,
      canManageCampaigns: true,
      canViewMerchReports: true,
      canManageUsers: true,
      canExportData: true,
      canConfigureSystem: true,
    },
    status: 'active',
    createdAt: '2024-01-01'
  },
  { 
    id: '2', 
    name: 'Ana Admin Mídia', 
    email: 'admin.midia@srofftrademarketing.com', 
    cpf: '234.567.890-11',
    role: 'admin',
    modules: ['media'],
    permissions: {
      canManageOutdoors: true,
      canManageContracts: true,
      canManageSuppliers: true,
      canApproveServiceOrders: true,
      canViewFinancials: true,
      canManageUsers: true,
      canExportData: true,
    },
    status: 'active',
    createdAt: '2024-01-05'
  },
  { 
    id: '3', 
    name: 'Paulo Admin Merch', 
    email: 'admin.merch@srofftrademarketing.com', 
    cpf: '345.678.901-22',
    role: 'admin',
    modules: ['merchandising'],
    permissions: {
      canManageChecklists: true,
      canManageQuestions: true,
      canManageCategories: true,
      canManageMaterials: true,
      canManageCampaigns: true,
      canViewMerchReports: true,
      canManageUsers: true,
      canExportData: true,
    },
    status: 'active',
    createdAt: '2024-01-05'
  },
  { 
    id: '4', 
    name: 'Fernanda Diretoria', 
    email: 'diretoria@srofftrademarketing.com', 
    cpf: '456.789.012-33',
    role: 'director',
    modules: ['media', 'merchandising'],
    permissions: {
      canApproveServiceOrders: true,
      canViewFinancials: true,
      canViewMerchReports: true,
      canExportData: true,
    },
    status: 'active',
    createdAt: '2024-01-10'
  },
  { 
    id: '5', 
    name: 'Carlos Gerente', 
    email: 'gerente@srofftrademarketing.com', 
    cpf: '567.890.123-44',
    role: 'manager',
    modules: ['media', 'merchandising'],
    pdvId: '1',
    permissions: {},
    status: 'active',
    createdAt: '2024-01-15'
  },
  { 
    id: '6', 
    name: 'Maria Colaboradora', 
    email: 'colaborador@srofftrademarketing.com', 
    cpf: '678.901.234-55',
    role: 'collaborator',
    modules: ['merchandising'],
    pdvId: '1',
    permissions: {},
    status: 'active',
    createdAt: '2024-01-20'
  },
  { 
    id: '7', 
    name: 'João Fornecedor', 
    email: 'fornecedor@externo.com', 
    cpf: '789.012.345-66',
    role: 'supplier',
    modules: ['media'],
    permissions: {},
    status: 'active',
    createdAt: '2024-02-01'
  },
];

// =============== PDVs ===============
export const mockPDVs: PDV[] = [
  { 
    id: '1', 
    code: 'PDV-001', 
    name: 'Posto Bandeira Azul', 
    type: 'both',
    address: 'Rod. BR-101, Km 45',
    city: 'São Paulo',
    state: 'SP',
    coordinates: { lat: -23.5505, lng: -46.6333 },
    managerId: '5',
    managerName: 'Carlos Gerente',
    activeModules: ['media', 'merchandising'],
    status: 'active',
    lastMerchScore: 87,
    lastMerchEvaluation: '2024-12-01',
    totalOutdoors: 3,
    operationalOutdoors: 2,
  },
  { 
    id: '2', 
    code: 'PDV-002', 
    name: 'Posto Estrela do Norte', 
    type: 'both',
    address: 'Av. Principal, 1200',
    city: 'Campinas',
    state: 'SP',
    coordinates: { lat: -22.9099, lng: -47.0626 },
    managerId: '5',
    managerName: 'Carlos Gerente',
    activeModules: ['media', 'merchandising'],
    status: 'active',
    lastMerchScore: 92,
    lastMerchEvaluation: '2024-12-02',
    totalOutdoors: 2,
    operationalOutdoors: 2,
  },
  { 
    id: '3', 
    code: 'PDV-003', 
    name: 'Conveniência Express Center', 
    type: 'conveniencia',
    address: 'Rua das Flores, 500',
    city: 'Rio de Janeiro',
    state: 'RJ',
    coordinates: { lat: -22.9068, lng: -43.1729 },
    activeModules: ['merchandising'],
    status: 'active',
    lastMerchScore: 75,
    lastMerchEvaluation: '2024-11-28',
  },
  { 
    id: '4', 
    code: 'PDV-004', 
    name: 'Posto Sol Nascente', 
    type: 'posto',
    address: 'Rod. MG-050, Km 120',
    city: 'Belo Horizonte',
    state: 'MG',
    coordinates: { lat: -19.9167, lng: -43.9345 },
    activeModules: ['media'],
    status: 'active',
    totalOutdoors: 4,
    operationalOutdoors: 3,
  },
  { 
    id: '5', 
    code: 'PDV-005', 
    name: 'Posto Rota do Sul', 
    type: 'both',
    address: 'BR-116, Km 200',
    city: 'Curitiba',
    state: 'PR',
    coordinates: { lat: -25.4284, lng: -49.2733 },
    activeModules: ['media', 'merchandising'],
    status: 'active',
    lastMerchScore: 68,
    lastMerchEvaluation: '2024-11-25',
    totalOutdoors: 2,
    operationalOutdoors: 1,
  },
];

// =============== OUTDOORS ===============
export const mockOutdoors: Outdoor[] = [
  { 
    id: 'out-1', 
    pdvId: '1', 
    pdvName: 'Posto Bandeira Azul',
    code: 'OUT-001', 
    location: 'Entrada principal', 
    width: 10, 
    height: 5, 
    area: 50,
    photoUrl: '/placeholder.svg',
    contractId: 'contract-1',
    status: 'operational',
    lastEvaluation: '2024-12-01',
  },
  { 
    id: 'out-2', 
    pdvId: '1', 
    pdvName: 'Posto Bandeira Azul',
    code: 'OUT-002', 
    location: 'Lateral direita', 
    width: 8, 
    height: 4, 
    area: 32,
    photoUrl: '/placeholder.svg',
    status: 'non_operational',
    lastEvaluation: '2024-12-01',
    nonOperationalReason: 'Lona rasgada',
  },
  { 
    id: 'out-3', 
    pdvId: '1', 
    pdvName: 'Posto Bandeira Azul',
    code: 'OUT-003', 
    location: 'Saída', 
    width: 6, 
    height: 3, 
    area: 18,
    photoUrl: '/placeholder.svg',
    status: 'pending_evaluation',
  },
  { 
    id: 'out-4', 
    pdvId: '2', 
    pdvName: 'Posto Estrela do Norte',
    code: 'OUT-004', 
    location: 'Frente da loja', 
    width: 12, 
    height: 6, 
    area: 72,
    photoUrl: '/placeholder.svg',
    contractId: 'contract-2',
    status: 'operational',
    lastEvaluation: '2024-12-02',
  },
  { 
    id: 'out-5', 
    pdvId: '2', 
    pdvName: 'Posto Estrela do Norte',
    code: 'OUT-005', 
    location: 'Estacionamento', 
    width: 8, 
    height: 4, 
    area: 32,
    photoUrl: '/placeholder.svg',
    status: 'operational',
    lastEvaluation: '2024-12-02',
  },
  { 
    id: 'out-6', 
    pdvId: '4', 
    pdvName: 'Posto Sol Nascente',
    code: 'OUT-006', 
    location: 'Entrada BR', 
    width: 15, 
    height: 8, 
    area: 120,
    photoUrl: '/placeholder.svg',
    contractId: 'contract-3',
    status: 'operational',
    lastEvaluation: '2024-11-30',
  },
  { 
    id: 'out-7', 
    pdvId: '4', 
    pdvName: 'Posto Sol Nascente',
    code: 'OUT-007', 
    location: 'Lateral', 
    width: 10, 
    height: 5, 
    area: 50,
    photoUrl: '/placeholder.svg',
    status: 'non_operational',
    nonOperationalReason: 'Vegetação obstruindo',
    lastEvaluation: '2024-11-30',
  },
];

// =============== CONTRACTS ===============
export const mockContracts: Contract[] = [
  {
    id: 'contract-1',
    outdoorId: 'out-1',
    outdoorCode: 'OUT-001',
    farmerName: 'José da Silva',
    farmerCpf: '111.222.333-44',
    farmerPhone: '(11) 99999-1111',
    farmerEmail: 'jose.silva@email.com',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    annualValue: 12000,
    monthlyValue: 1000,
    paymentMethod: 'cash',
    autoRenewal: true,
    status: 'active',
    documentUrl: '/contracts/contract-1.pdf',
  },
  {
    id: 'contract-2',
    outdoorId: 'out-4',
    outdoorCode: 'OUT-004',
    farmerName: 'Maria Santos',
    farmerCpf: '222.333.444-55',
    farmerPhone: '(19) 98888-2222',
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    annualValue: 18000,
    monthlyValue: 1500,
    paymentMethod: 'fuel',
    autoRenewal: false,
    status: 'expiring',
  },
  {
    id: 'contract-3',
    outdoorId: 'out-6',
    outdoorCode: 'OUT-006',
    farmerName: 'Pedro Oliveira',
    farmerCpf: '333.444.555-66',
    farmerPhone: '(31) 97777-3333',
    startDate: '2023-06-01',
    endDate: '2024-05-31',
    annualValue: 24000,
    monthlyValue: 2000,
    paymentMethod: 'both',
    autoRenewal: true,
    status: 'expired',
  },
];

// =============== SUPPLIERS ===============
export const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Gráfica Visual Express',
    cnpj: '12.345.678/0001-90',
    address: 'Rua das Indústrias, 1000 - São Paulo, SP',
    phone: '(11) 3333-4444',
    email: 'contato@visualexpress.com.br',
    serviceTypes: ['installation', 'replacement'],
    status: 'active',
  },
  {
    id: 'sup-2',
    name: 'Manutenção Total Outdoors',
    cnpj: '23.456.789/0001-01',
    address: 'Av. Industrial, 500 - Campinas, SP',
    phone: '(19) 4444-5555',
    email: 'atendimento@manutencaototal.com.br',
    serviceTypes: ['maintenance', 'removal'],
    status: 'active',
  },
];

// =============== SERVICE ORDERS ===============
export const mockServiceOrders: ServiceOrder[] = [
  {
    id: 'os-1',
    number: 'OS-2024-001',
    outdoorId: 'out-2',
    outdoorCode: 'OUT-002',
    pdvName: 'Posto Bandeira Azul',
    supplierId: 'sup-1',
    supplierName: 'Gráfica Visual Express',
    type: 'replacement',
    description: 'Troca de lona danificada',
    totalCost: 4500,
    status: 'pending',
    createdAt: '2024-12-03',
  },
  {
    id: 'os-2',
    number: 'OS-2024-002',
    outdoorId: 'out-7',
    outdoorCode: 'OUT-007',
    pdvName: 'Posto Sol Nascente',
    supplierId: 'sup-2',
    supplierName: 'Manutenção Total Outdoors',
    type: 'maintenance',
    description: 'Limpeza de vegetação e manutenção estrutural',
    totalCost: 2800,
    status: 'approved',
    createdAt: '2024-12-01',
    approvedAt: '2024-12-02',
  },
];

// =============== CHECKLIST CATEGORIES ===============
export const mockCategories: ChecklistCategory[] = [
  {
    id: 'interior',
    name: 'Interior da Loja',
    icon: 'Store',
    order: 1,
    questions: [
      { id: 'int-1', categoryId: 'interior', text: 'O piso está limpo e sem obstáculos?', tip: 'Verificar corredores principais', order: 1 },
      { id: 'int-2', categoryId: 'interior', text: 'A iluminação está funcionando corretamente?', tip: 'Checar todas as áreas', order: 2 },
      { id: 'int-3', categoryId: 'interior', text: 'O ar condicionado está funcionando?', order: 3 },
      { id: 'int-4', categoryId: 'interior', text: 'A sinalização interna está visível e atualizada?', order: 4, requiresMaterial: true, materialType: 'signage' },
      { id: 'int-5', categoryId: 'interior', text: 'Os displays promocionais estão posicionados?', order: 5, requiresMaterial: true, materialType: 'display' },
    ],
  },
  {
    id: 'exterior',
    name: 'Exterior e Vitrines',
    icon: 'Building2',
    order: 2,
    questions: [
      { id: 'ext-1', categoryId: 'exterior', text: 'A fachada está limpa e em bom estado?', order: 1 },
      { id: 'ext-2', categoryId: 'exterior', text: 'A vitrine está montada conforme padrão?', tip: 'Comparar com guia visual', order: 2 },
      { id: 'ext-3', categoryId: 'exterior', text: 'Os banners externos estão em bom estado?', order: 3, requiresMaterial: true, materialType: 'banner' },
      { id: 'ext-4', categoryId: 'exterior', text: 'A iluminação externa está funcionando?', order: 4 },
      { id: 'ext-5', categoryId: 'exterior', text: 'O letreiro está aceso e visível?', order: 5 },
    ],
  },
  {
    id: 'shelves',
    name: 'Prateleiras e Gôndolas',
    icon: 'LayoutGrid',
    order: 3,
    questions: [
      { id: 'shv-1', categoryId: 'shelves', text: 'Os produtos estão organizados por categoria?', order: 1 },
      { id: 'shv-2', categoryId: 'shelves', text: 'As etiquetas de preço estão corretas e visíveis?', order: 2 },
      { id: 'shv-3', categoryId: 'shelves', text: 'Não há produtos vencidos nas prateleiras?', tip: 'Verificar datas de validade', order: 3, isCritical: true },
      { id: 'shv-4', categoryId: 'shelves', text: 'O planograma está sendo seguido?', order: 4 },
      { id: 'shv-5', categoryId: 'shelves', text: 'Não há rupturas de estoque visíveis?', order: 5, isCritical: true },
      { id: 'shv-6', categoryId: 'shelves', text: 'Os wobblers promocionais estão instalados?', order: 6, requiresMaterial: true, materialType: 'promotional' },
    ],
  },
  {
    id: 'staff',
    name: 'Colaboradores',
    icon: 'Users',
    order: 4,
    questions: [
      { id: 'stf-1', categoryId: 'staff', text: 'Os colaboradores estão uniformizados?', order: 1 },
      { id: 'stf-2', categoryId: 'staff', text: 'Os crachás estão visíveis?', order: 2 },
      { id: 'stf-3', categoryId: 'staff', text: 'O atendimento está sendo proativo?', order: 3 },
      { id: 'stf-4', categoryId: 'staff', text: 'A equipe conhece as promoções vigentes?', order: 4 },
    ],
  },
  {
    id: 'checkout',
    name: 'Frente de Caixa',
    icon: 'CreditCard',
    order: 5,
    questions: [
      { id: 'chk-1', categoryId: 'checkout', text: 'Os caixas estão limpos e organizados?', order: 1 },
      { id: 'chk-2', categoryId: 'checkout', text: 'Os produtos de impulso estão abastecidos?', order: 2 },
      { id: 'chk-3', categoryId: 'checkout', text: 'O sistema de pagamento está funcionando?', order: 3, isCritical: true },
      { id: 'chk-4', categoryId: 'checkout', text: 'Há materiais promocionais no caixa?', order: 4, requiresMaterial: true, materialType: 'flyer' },
      { id: 'chk-5', categoryId: 'checkout', text: 'O tempo de espera na fila é aceitável?', tip: 'Máximo 5 minutos', order: 5 },
    ],
  },
];

// =============== MERCHANDISING EVALUATIONS ===============
export const mockMerchEvaluations: MerchEvaluation[] = [
  {
    id: 'merch-eval-1',
    pdvId: '1',
    pdvName: 'Posto Bandeira Azul',
    evaluatorId: '5',
    evaluatorName: 'Carlos Gerente',
    date: '2024-12-01',
    status: 'completed',
    answers: [],
    totalScore: 22,
    totalPossiblePoints: 25,
    percentageScore: 87,
    categoryScores: { interior: 90, exterior: 85, shelves: 88, staff: 80, checkout: 90 },
  },
  {
    id: 'merch-eval-2',
    pdvId: '2',
    pdvName: 'Posto Estrela do Norte',
    evaluatorId: '5',
    evaluatorName: 'Carlos Gerente',
    date: '2024-12-02',
    status: 'completed',
    answers: [],
    totalScore: 23,
    totalPossiblePoints: 25,
    percentageScore: 92,
    categoryScores: { interior: 95, exterior: 90, shelves: 92, staff: 88, checkout: 95 },
  },
];

// =============== TRADE MATERIALS ===============
export const mockMaterials: TradeMaterial[] = [
  {
    id: 'mat-1',
    code: 'MAT-001',
    name: 'Banner Promocional Verão',
    type: 'banner',
    category: 'seasonal',
    description: 'Banner 1m x 2m para campanha de verão',
    unitCost: 45.00,
    currentStock: 150,
    minimumStock: 50,
    imageUrl: '/placeholder.svg',
    status: 'active',
  },
  {
    id: 'mat-2',
    code: 'MAT-002',
    name: 'Display de Balcão',
    type: 'display',
    category: 'permanent',
    description: 'Display acrílico para produtos em destaque',
    unitCost: 85.00,
    currentStock: 30,
    minimumStock: 20,
    imageUrl: '/placeholder.svg',
    status: 'active',
  },
  {
    id: 'mat-3',
    code: 'MAT-003',
    name: 'Wobbler Promoção',
    type: 'promotional',
    category: 'campaign',
    description: 'Wobbler para gôndolas - promoções',
    unitCost: 5.50,
    currentStock: 500,
    minimumStock: 200,
    imageUrl: '/placeholder.svg',
    status: 'active',
  },
  {
    id: 'mat-4',
    code: 'MAT-004',
    name: 'Adesivo de Vitrine',
    type: 'sticker',
    category: 'permanent',
    description: 'Adesivo perfurado para vitrines',
    unitCost: 120.00,
    currentStock: 15,
    minimumStock: 10,
    imageUrl: '/placeholder.svg',
    status: 'active',
  },
];

// =============== CAMPAIGNS ===============
export const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Verão Refrescante 2024',
    code: 'VERAO2024',
    description: 'Campanha de verão com foco em bebidas geladas',
    startDate: '2024-12-01',
    endDate: '2025-02-28',
    type: 'seasonal',
    targetPdvIds: ['1', '2', '3', '5'],
    requiredMaterials: [
      { materialId: 'mat-1', quantityPerPdv: 2, mandatory: true },
      { materialId: 'mat-3', quantityPerPdv: 10, mandatory: true },
    ],
    kpiTargets: { targetScore: 90, targetCoverage: 100 },
    status: 'active',
    createdAt: '2024-11-15',
  },
  {
    id: 'camp-2',
    name: 'Black Friday 2024',
    code: 'BF2024',
    description: 'Campanha especial Black Friday',
    startDate: '2024-11-20',
    endDate: '2024-11-30',
    type: 'promotional',
    targetPdvIds: ['1', '2', '3', '4', '5'],
    requiredMaterials: [
      { materialId: 'mat-2', quantityPerPdv: 1, mandatory: true },
      { materialId: 'mat-4', quantityPerPdv: 1, mandatory: false },
    ],
    kpiTargets: { targetScore: 85, targetCoverage: 95 },
    status: 'ended',
    createdAt: '2024-11-01',
  },
];

// =============== ALERTS ===============
export const mockAlerts: SystemAlert[] = [
  {
    id: 'alert-1',
    type: 'contract_expiring',
    title: 'Contrato próximo do vencimento',
    message: 'O contrato do outdoor OUT-004 vence em 60 dias',
    priority: 'medium',
    module: 'media',
    relatedId: 'contract-2',
    createdAt: '2024-12-03',
  },
  {
    id: 'alert-2',
    type: 'evaluation_pending',
    title: 'Avaliação mensal pendente',
    message: '3 outdoors aguardam avaliação mensal',
    priority: 'high',
    module: 'media',
    createdAt: '2024-12-01',
  },
  {
    id: 'alert-3',
    type: 'critical_score',
    title: 'Score crítico detectado',
    message: 'Posto Rota do Sul com score de 68% - abaixo da meta',
    priority: 'high',
    module: 'merchandising',
    relatedId: '5',
    createdAt: '2024-11-26',
  },
  {
    id: 'alert-4',
    type: 'low_stock',
    title: 'Estoque baixo',
    message: 'Display de Balcão com estoque abaixo do mínimo',
    priority: 'medium',
    module: 'merchandising',
    relatedId: 'mat-2',
    createdAt: '2024-12-02',
  },
];

// =============== HELPER FUNCTIONS ===============
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

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Administrador',
    admin: 'Administrador',
    director: 'Diretoria',
    manager: 'Gerente',
    collaborator: 'Colaborador',
    supplier: 'Fornecedor',
  };
  return labels[role] || role;
}
