import { useState, useEffect, useCallback } from 'react';
import { showToast } from '@/lib/toast';

const DRAFT_KEY = 'contract_draft';

interface ContractDraft {
  outdoorId: string;
  farmerName: string;
  farmerCpf: string;
  farmerPhone: string;
  farmerEmail: string;
  startDate: string;
  endDate: string;
  monthlyValue: string;
  paymentMethod: string;
  autoRenewal: boolean;
  documentUrl: string;
  documentName: string;
  lastSaved: number;
}

const initialDraft: ContractDraft = {
  outdoorId: '',
  farmerName: '',
  farmerCpf: '',
  farmerPhone: '',
  farmerEmail: '',
  startDate: '',
  endDate: '',
  monthlyValue: '',
  paymentMethod: '',
  autoRenewal: false,
  documentUrl: '',
  documentName: '',
  lastSaved: 0,
};

export function useDraftContract() {
  const [hasDraft, setHasDraft] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  // Check if draft exists on mount
  useEffect(() => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed: ContractDraft = JSON.parse(draft);
        // Check if draft has meaningful data
        const hasData = parsed.farmerName || parsed.outdoorId || parsed.monthlyValue;
        if (hasData) {
          setHasDraft(true);
          setShowRecoveryPrompt(true);
        }
      } catch {
        sessionStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  const saveDraft = useCallback((data: Omit<ContractDraft, 'lastSaved'>) => {
    const draft: ContractDraft = {
      ...data,
      lastSaved: Date.now(),
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, []);

  const loadDraft = useCallback((): Omit<ContractDraft, 'lastSaved'> | null => {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (!draft) return null;
    
    try {
      const parsed: ContractDraft = JSON.parse(draft);
      const { lastSaved, ...formData } = parsed;
      return formData;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setShowRecoveryPrompt(false);
  }, []);

  const recoverDraft = useCallback(() => {
    setShowRecoveryPrompt(false);
    const draft = loadDraft();
    if (draft) {
      showToast.info('Rascunho recuperado!');
    }
    return draft;
  }, [loadDraft]);

  const dismissRecovery = useCallback(() => {
    setShowRecoveryPrompt(false);
    clearDraft();
  }, [clearDraft]);

  return {
    hasDraft,
    showRecoveryPrompt,
    saveDraft,
    loadDraft,
    clearDraft,
    recoverDraft,
    dismissRecovery,
  };
}
