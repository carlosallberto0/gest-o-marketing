import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/lib/toast';

interface NotificationData {
  url?: string;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      showToast.error('Notificações não são suportadas neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        showToast.success('Notificações ativadas com sucesso!');
        return true;
      } else if (result === 'denied') {
        showToast.error('Permissão de notificações negada');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      showToast.error('Erro ao solicitar permissão de notificações');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions & { data?: NotificationData }) => {
    if (permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to the action URL if provided
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [permission]);

  // Subscribe to real-time alerts
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    // Subscribe to alerts table
    const alertsChannel = supabase
      .channel('alerts-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const alert = payload.new as any;
          showNotification(alert.title, {
            body: alert.message,
            tag: alert.id,
          });
        }
      )
      .subscribe();

    // Subscribe to global alerts (user_id is null)
    const globalAlertsChannel = supabase
      .channel('alerts-global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: 'user_id=is.null',
        },
        (payload) => {
          const alert = payload.new as any;
          showNotification(alert.title, {
            body: alert.message,
            tag: alert.id,
          });
        }
      )
      .subscribe();

    // Subscribe to notificacoes_sistema table (system notifications)
    const notificacoesChannel = supabase
      .channel('notificacoes-push')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes_sistema',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          const notificacao = payload.new as any;
          showNotification(notificacao.titulo, {
            body: notificacao.mensagem,
            tag: notificacao.id,
            data: { url: notificacao.url_acao },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(globalAlertsChannel);
      supabase.removeChannel(notificacoesChannel);
    };
  }, [user, permission, showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
}
