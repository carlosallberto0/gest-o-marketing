import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useSystemSetting } from '@/hooks/useSystemSettings';

export type ToastVariant = 'success' | 'warning' | 'info' | 'error';
export type ToastStyleVariant = 'default' | 'filled';
export type ToastPosition = 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';

export interface ToastConfig {
  id: string;
  variant: ToastVariant;
  title: string;
  description: string;
  duration?: number;
}

export interface ToastSettings {
  style_variant: ToastStyleVariant;
  position: ToastPosition;
  duration: number;
  max_toasts: number;
  show_close_button: boolean;
  enable_animations: boolean;
}

const defaultSettings: ToastSettings = {
  style_variant: 'filled',
  position: 'top-right',
  duration: 5000,
  max_toasts: 3,
  show_close_button: true,
  enable_animations: true,
};

interface AlertToastContextType {
  toasts: ToastConfig[];
  settings: ToastSettings;
  addToast: (toast: Omit<ToastConfig, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const AlertToastContext = createContext<AlertToastContextType | null>(null);

export function AlertToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const { data: dbSettings } = useSystemSetting<ToastSettings>('toast_style_settings', defaultSettings);
  
  const settings = dbSettings || defaultSettings;

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastConfig, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration ?? settings.duration;

    setToasts((prev) => {
      const newToasts = [...prev, { ...toast, id, duration }];
      // Limit to max_toasts
      if (newToasts.length > settings.max_toasts) {
        return newToasts.slice(-settings.max_toasts);
      }
      return newToasts;
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [settings.duration, settings.max_toasts, removeToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <AlertToastContext.Provider value={{ toasts, settings, addToast, removeToast, clearToasts }}>
      {children}
    </AlertToastContext.Provider>
  );
}

export function useAlertToastContext() {
  const context = useContext(AlertToastContext);
  if (!context) {
    throw new Error('useAlertToastContext must be used within AlertToastProvider');
  }
  return context;
}
