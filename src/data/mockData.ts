import { ChecklistCategory, Store, User, ChecklistEvaluation } from '@/types/checklist';

export const mockUsers: User[] = [
  { id: '1', name: 'Carlos Admin', email: 'admin@empresa.com', role: 'admin' },
  { id: '2', name: 'Maria Gerente', email: 'gerente@empresa.com', role: 'manager', storeId: '1' },
  { id: '3', name: 'João Colaborador', email: 'colaborador@empresa.com', role: 'collaborator', storeId: '1' },
];

export const mockStores: Store[] = [
  { id: '1', name: 'Loja Centro', region: 'Sul', address: 'Av. Principal, 100', lastScore: 87, lastEvaluation: '2024-01-15' },
  { id: '2', name: 'Loja Shopping Norte', region: 'Norte', address: 'Shopping Norte, Loja 45', lastScore: 92, lastEvaluation: '2024-01-14' },
  { id: '3', name: 'Loja Bairro Alto', region: 'Leste', address: 'Rua das Flores, 250', lastScore: 75, lastEvaluation: '2024-01-13' },
  { id: '4', name: 'Loja Express', region: 'Oeste', address: 'Terminal Rodoviário, Box 12', lastScore: 68, lastEvaluation: '2024-01-12' },
  { id: '5', name: 'Loja Mall Central', region: 'Centro', address: 'Mall Central, Piso 2', lastScore: 95, lastEvaluation: '2024-01-15' },
];

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
      { id: 'int-4', categoryId: 'interior', text: 'A sinalização interna está visível e atualizada?', order: 4 },
      { id: 'int-5', categoryId: 'interior', text: 'Os provadores estão limpos e organizados?', order: 5 },
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
      { id: 'ext-3', categoryId: 'exterior', text: 'Os preços na vitrine estão corretos?', order: 3 },
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
      { id: 'shv-3', categoryId: 'shelves', text: 'Não há produtos vencidos nas prateleiras?', tip: 'Verificar datas de validade', order: 3 },
      { id: 'shv-4', categoryId: 'shelves', text: 'O planograma está sendo seguido?', order: 4 },
      { id: 'shv-5', categoryId: 'shelves', text: 'Não há rupturas de estoque visíveis?', order: 5 },
      { id: 'shv-6', categoryId: 'shelves', text: 'Os produtos promocionais estão destacados?', order: 6 },
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
      { id: 'chk-3', categoryId: 'checkout', text: 'O sistema de pagamento está funcionando?', order: 3 },
      { id: 'chk-4', categoryId: 'checkout', text: 'Há sacolas e embalagens disponíveis?', order: 4 },
      { id: 'chk-5', categoryId: 'checkout', text: 'O tempo de espera na fila é aceitável?', tip: 'Máximo 5 minutos', order: 5 },
    ],
  },
];

export const mockEvaluations: ChecklistEvaluation[] = [
  {
    id: 'eval-1',
    storeId: '1',
    storeName: 'Loja Centro',
    evaluatorId: '2',
    evaluatorName: 'Maria Gerente',
    date: '2024-01-15',
    status: 'completed',
    answers: [],
    totalScore: 87,
    categoryScores: { interior: 90, exterior: 85, shelves: 88, staff: 80, checkout: 90 },
  },
  {
    id: 'eval-2',
    storeId: '2',
    storeName: 'Loja Shopping Norte',
    evaluatorId: '2',
    evaluatorName: 'Maria Gerente',
    date: '2024-01-14',
    status: 'completed',
    answers: [],
    totalScore: 92,
    categoryScores: { interior: 95, exterior: 90, shelves: 92, staff: 88, checkout: 95 },
  },
];

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
