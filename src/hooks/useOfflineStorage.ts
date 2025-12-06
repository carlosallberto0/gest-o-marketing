import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const OFFLINE_STORAGE_KEY = 'offline_checklists';
const SYNC_STATUS_KEY = 'offline_sync_status';

interface OfflineChecklist {
  id: string;
  pdvId: string;
  answers: Record<string, unknown>;
  categories: unknown[];
  signatureUrl?: string;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
}

interface OfflineSyncStatus {
  lastSync: string | null;
  pendingCount: number;
  isOnline: boolean;
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChecklists, setPendingChecklists] = useState<OfflineChecklist[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada! Sincronizando dados...');
      syncPendingChecklists();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Você está offline. Os dados serão salvos localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending checklists from storage
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingChecklists(parsed.filter((c: OfflineChecklist) => c.syncStatus !== 'synced'));
      } catch (error) {
        console.error('Error loading offline checklists:', error);
      }
    }
  }, []);

  // Save checklist offline
  const saveOfflineChecklist = useCallback((checklist: Omit<OfflineChecklist, 'id' | 'createdAt' | 'syncStatus'>) => {
    const newChecklist: OfflineChecklist = {
      ...checklist,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    setPendingChecklists(prev => {
      const updated = [...prev, newChecklist];
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    toast.info('Checklist salvo localmente. Será sincronizado quando houver conexão.');
    return newChecklist;
  }, []);

  // Sync pending checklists
  const syncPendingChecklists = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pending = pendingChecklists.filter(c => c.syncStatus === 'pending');
    if (pending.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let errorCount = 0;

    for (const checklist of pending) {
      try {
        // Update status to syncing
        setPendingChecklists(prev => 
          prev.map(c => c.id === checklist.id ? { ...c, syncStatus: 'syncing' } : c)
        );

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Calculate scores (simplified)
        const answersArray = Object.values(checklist.answers) as { value?: string }[];
        const totalAnswers = answersArray.filter(a => a?.value).length;
        const yesCount = answersArray.filter(a => a?.value === 'yes' || a?.value === 'na').length;
        const percentageScore = totalAnswers > 0 ? Math.round((yesCount / totalAnswers) * 100) : 0;

        // Insert evaluation
        const { data: evaluation, error: evalError } = await supabase
          .from('merch_evaluations')
          .insert({
            pdv_id: checklist.pdvId,
            evaluator_id: user.id,
            total_score: yesCount,
            total_possible_points: totalAnswers,
            percentage_score: percentageScore,
            signature_url: checklist.signatureUrl || null,
            status: 'completed',
            completed_at: checklist.createdAt,
            category_scores: {},
          })
          .select()
          .single();

        if (evalError) throw evalError;

        // Insert answers
        const answerInserts = Object.entries(checklist.answers)
          .filter(([, answer]) => (answer as { value?: string })?.value)
          .map(([questionId, answer]) => ({
            evaluation_id: evaluation.id,
            question_id: questionId,
            value: (answer as { value?: 'yes' | 'no' | 'na' })?.value || null,
            observation: (answer as { observation?: string })?.observation || null,
            photo_url: (answer as { photoUrl?: string })?.photoUrl || null,
          }));

        if (answerInserts.length > 0) {
          const { error: answersError } = await supabase
            .from('evaluation_answers')
            .insert(answerInserts);

          if (answersError) throw answersError;
        }

        // Mark as synced
        setPendingChecklists(prev => 
          prev.map(c => c.id === checklist.id ? { ...c, syncStatus: 'synced' } : c)
        );
        syncedCount++;
      } catch (error) {
        console.error('Error syncing checklist:', error);
        setPendingChecklists(prev => 
          prev.map(c => c.id === checklist.id ? { ...c, syncStatus: 'error' } : c)
        );
        errorCount++;
      }
    }

    // Update localStorage
    setPendingChecklists(prev => {
      const remaining = prev.filter(c => c.syncStatus !== 'synced');
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(remaining));
      return remaining;
    });

    setIsSyncing(false);

    if (syncedCount > 0) {
      toast.success(`${syncedCount} checklist(s) sincronizado(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} checklist(s) não puderam ser sincronizados.`);
    }

    // Update sync status
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
      lastSync: new Date().toISOString(),
      pendingCount: pendingChecklists.filter(c => c.syncStatus !== 'synced').length,
      isOnline,
    }));
  }, [isOnline, isSyncing, pendingChecklists]);

  // Retry failed syncs
  const retryFailedSyncs = useCallback(() => {
    setPendingChecklists(prev => 
      prev.map(c => c.syncStatus === 'error' ? { ...c, syncStatus: 'pending' } : c)
    );
    syncPendingChecklists();
  }, [syncPendingChecklists]);

  // Clear synced checklists
  const clearSyncedChecklists = useCallback(() => {
    setPendingChecklists(prev => {
      const remaining = prev.filter(c => c.syncStatus !== 'synced');
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(remaining));
      return remaining;
    });
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingChecklists,
    pendingCount: pendingChecklists.filter(c => c.syncStatus === 'pending' || c.syncStatus === 'error').length,
    saveOfflineChecklist,
    syncPendingChecklists,
    retryFailedSyncs,
    clearSyncedChecklists,
  };
}