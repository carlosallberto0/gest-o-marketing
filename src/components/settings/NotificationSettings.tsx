import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const { isSupported, permission, requestPermission, showNotification } = usePushNotifications();

  const handleTestNotification = () => {
    showNotification('Teste de Notificação', {
      body: 'Esta é uma notificação de teste do SR Off Trade Marketing.',
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas em tempo real sobre eventos importantes do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status das Notificações</p>
            <p className="text-sm text-muted-foreground">
              {permission === 'granted' 
                ? 'Notificações ativadas'
                : permission === 'denied'
                ? 'Notificações bloqueadas'
                : 'Notificações não configuradas'
              }
            </p>
          </div>
          <Badge
            className={
              permission === 'granted'
                ? 'bg-success/10 text-success'
                : permission === 'denied'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-warning/10 text-warning'
            }
          >
            {permission === 'granted' ? 'Ativo' : permission === 'denied' ? 'Bloqueado' : 'Pendente'}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-3">
          {permission !== 'granted' && permission !== 'denied' && (
            <Button onClick={requestPermission}>
              <Bell className="h-4 w-4 mr-2" />
              Ativar Notificações
            </Button>
          )}

          {permission === 'denied' && (
            <p className="text-sm text-muted-foreground">
              Para ativar as notificações, você precisa alterar as permissões nas configurações do seu navegador.
            </p>
          )}

          {permission === 'granted' && (
            <Button variant="outline" onClick={handleTestNotification}>
              <Check className="h-4 w-4 mr-2" />
              Testar Notificação
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground pt-2 border-t border-border">
          <p className="font-medium mb-2">Você receberá notificações sobre:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Novos alertas de contratos vencendo</li>
            <li>Outdoors pendentes de avaliação</li>
            <li>Atualizações de planos de ação</li>
            <li>Novas avaliações e comentários</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
