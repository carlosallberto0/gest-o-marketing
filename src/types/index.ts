// =============== USER TYPES ===============
export type UserRole = 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier';

export type ModuleAccess = 'media' | 'merchandising';

export interface UserPermissions {
  // Media Externa
  canManageOutdoors?: boolean;
  canManageContracts?: boolean;
  canManageSuppliers?: boolean;
  canApproveServiceOrders?: boolean;
  canViewFinancials?: boolean;
  // Merchandising
  canManageChecklists?: boolean;
  canManageQuestions?: boolean;
  canManageCategories?: boolean;
  canManageMaterials?: boolean;
  canManageCampaigns?: boolean;
  canViewMerchReports?: boolean;
  // General
  canManageUsers?: boolean;
  canExportData?: boolean;
  canConfigureSystem?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  role: UserRole;
  modules: ModuleAccess[];
  permissions: UserPermissions;
  pdvId?: string;
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
}

// =============== PDV TYPES ===============
export type PDVType = 'posto' | 'conveniencia' | 'both';

export interface PDV {
  id: string;
  code: string;
  name: string;
  type: PDVType;
  address: string;
  city: string;
  state: string;
  coordinates?: { lat: number; lng: number };
  managerId?: string;
  managerName?: string;
  activeModules: ModuleAccess[];
  status: 'active' | 'inactive';
  // Merchandising
  lastMerchScore?: number;
  lastMerchEvaluation?: string;
  // Media
  totalOutdoors?: number;
  operationalOutdoors?: number;
}

// =============== OUTDOOR TYPES ===============
export type OutdoorStatus = 'operational' | 'non_operational' | 'pending_evaluation';

export interface Outdoor {
  id: string;
  pdvId: string;
  pdvName: string;
  code: string;
  location: string;
  locationUrl?: string;
  width: number;
  height: number;
  area: number;
  photoUrl?: string;
  contractId?: string;
  status: OutdoorStatus;
  lastEvaluation?: string;
  nonOperationalReason?: string;
  lat: number | null;
  lng: number | null;
  validationRadiusMeters: number;
  descriptionType?: string;
}

// =============== CONTRACT TYPES ===============
export type PaymentMethod = 'cash' | 'fuel' | 'both';

export interface Contract {
  id: string;
  outdoorId: string;
  outdoorCode: string;
  farmerName: string;
  farmerCpf: string;
  farmerPhone?: string;
  farmerEmail?: string;
  startDate: string;
  endDate: string;
  annualValue: number;
  monthlyValue: number;
  paymentMethod: PaymentMethod;
  autoRenewal: boolean;
  status: 'active' | 'expiring' | 'expired';
  documentUrl?: string;
}

// =============== SERVICE ORDER TYPES ===============
export type ServiceType = 'installation' | 'maintenance' | 'removal' | 'replacement';
export type ServiceOrderStatus = 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export interface ServiceOrder {
  id: string;
  number: string;
  outdoorId: string;
  outdoorCode: string;
  pdvName: string;
  supplierId: string;
  supplierName: string;
  type: ServiceType;
  description: string;
  totalCost: number;
  status: ServiceOrderStatus;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  pdfUrl?: string;
}

// =============== MONTHLY EVALUATION (MEDIA) ===============
export interface MonthlyMediaEvaluation {
  id: string;
  outdoorId: string;
  outdoorCode: string;
  pdvId: string;
  pdvName: string;
  monthYear: string;
  status: OutdoorStatus;
  nonOperationalReason?: string;
  photoUrl?: string;
  coordinates?: { lat: number; lng: number };
  measuresConfirmed: boolean;
  evaluatorId: string;
  evaluatorName: string;
  evaluatedAt: string;
}

// =============== MERCHANDISING TYPES ===============
export type AnswerValue = 'yes' | 'no' | 'na' | null;

export interface ChecklistQuestion {
  id: string;
  categoryId: string;
  text: string;
  tip?: string;
  order: number;
  requiresPhoto?: boolean;
  isCritical?: boolean;
  requiresMaterial?: boolean;
  materialType?: string;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  questions: ChecklistQuestion[];
}

export interface QuestionAnswer {
  questionId: string;
  value: AnswerValue;
  observation?: string;
  photoUrl?: string;
  materialUsed?: string[];
}

export interface MerchEvaluation {
  id: string;
  pdvId: string;
  pdvName: string;
  evaluatorId: string;
  evaluatorName: string;
  date: string;
  status: 'draft' | 'completed';
  answers: QuestionAnswer[];
  totalScore: number;
  totalPossiblePoints: number;
  percentageScore: number;
  categoryScores: Record<string, number>;
  signatureUrl?: string;
}

// =============== TRADE MATERIALS ===============
export type MaterialType = 'promotional' | 'printed' | 'gift' | 'sample' | 'display' | 'signage' | 'sticker' | 'banner' | 'poster' | 'flyer';

export interface TradeMaterial {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  category: string;
  description?: string;
  unitCost: number;
  currentStock: number;
  minimumStock: number;
  imageUrl?: string;
  status: 'active' | 'inactive';
}

// =============== CAMPAIGNS ===============
export type CampaignType = 'promotional' | 'institutional' | 'seasonal' | 'launch' | 'partnership';

export interface Campaign {
  id: string;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: CampaignType;
  targetPdvIds: string[];
  requiredMaterials: { materialId: string; quantityPerPdv: number; mandatory: boolean }[];
  kpiTargets: { targetScore: number; targetCoverage: number };
  status: 'draft' | 'active' | 'ended';
  createdAt: string;
}

// =============== SUPPLIER ===============
export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  serviceTypes: ServiceType[];
  status: 'active' | 'inactive';
}

// =============== ALERTS ===============
export type AlertType = 'contract_expiring' | 'evaluation_pending' | 'low_stock' | 'critical_score' | 'service_order';

export interface SystemAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  module: ModuleAccess;
  relatedId?: string;
  createdAt: string;
  readAt?: string;
}
