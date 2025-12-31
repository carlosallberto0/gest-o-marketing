import { useCallback } from 'react';
import { useAlertToastContext, ToastVariant } from '@/contexts/AlertToastContext';

export function useAlertToast() {
  const { addToast, removeToast, clearToasts, toasts, settings } = useAlertToastContext();

  const success = useCallback((title: string, description: string = '') => {
    return addToast({ variant: 'success', title, description });
  }, [addToast]);

  const error = useCallback((title: string, description: string = '') => {
    return addToast({ variant: 'error', title, description });
  }, [addToast]);

  const warning = useCallback((title: string, description: string = '') => {
    return addToast({ variant: 'warning', title, description });
  }, [addToast]);

  const info = useCallback((title: string, description: string = '') => {
    return addToast({ variant: 'info', title, description });
  }, [addToast]);

  const show = useCallback((variant: ToastVariant, title: string, description: string = '') => {
    return addToast({ variant, title, description });
  }, [addToast]);

  return {
    success,
    error,
    warning,
    info,
    show,
    dismiss: removeToast,
    clearAll: clearToasts,
    toasts,
    settings,
  };
}
