import { toast as sonnerToast } from 'sonner';

// Wrapper that uses sonner as fallback
// This will be replaced by AlertToast when context is available

let alertToastInstance: {
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
} | null = null;

export function setAlertToastInstance(instance: typeof alertToastInstance) {
  alertToastInstance = instance;
}

export const showToast = {
  success: (title: string, description?: string) => {
    if (alertToastInstance) {
      return alertToastInstance.success(title, description || '');
    }
    sonnerToast.success(title, { description });
    return '';
  },
  error: (title: string, description?: string) => {
    if (alertToastInstance) {
      return alertToastInstance.error(title, description || '');
    }
    sonnerToast.error(title, { description });
    return '';
  },
  warning: (title: string, description?: string) => {
    if (alertToastInstance) {
      return alertToastInstance.warning(title, description || '');
    }
    sonnerToast.warning(title, { description });
    return '';
  },
  info: (title: string, description?: string) => {
    if (alertToastInstance) {
      return alertToastInstance.info(title, description || '');
    }
    sonnerToast.info(title, { description });
    return '';
  },
};
