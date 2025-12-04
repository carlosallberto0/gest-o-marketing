export type UserRole = 'admin' | 'manager' | 'collaborator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
}

export interface Store {
  id: string;
  name: string;
  region: string;
  address: string;
  lastScore?: number;
  lastEvaluation?: string;
}

export type AnswerValue = 'yes' | 'no' | 'na' | null;

export interface ChecklistQuestion {
  id: string;
  categoryId: string;
  text: string;
  tip?: string;
  order: number;
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
}

export interface ChecklistEvaluation {
  id: string;
  storeId: string;
  storeName: string;
  evaluatorId: string;
  evaluatorName: string;
  date: string;
  status: 'draft' | 'completed';
  answers: QuestionAnswer[];
  totalScore: number;
  categoryScores: Record<string, number>;
}
