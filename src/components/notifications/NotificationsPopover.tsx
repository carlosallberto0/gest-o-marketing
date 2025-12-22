import { useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useNotificacoes,
  useNotificacoesNaoLidas,
  useMarcarNotificacaoLida,
  useMarcarTodasLidas,
  Notificacao,
} from '@/hooks/useNotificacoes';
import { cn } from '@/lib/utils';

const getModuloColor = (modulo: string) => {
  switch (modulo) {
    case 'media':
      return 'bg-blue-500/10 text-blue-500';
    case 'merchandising':
      return 'bg-green-500/10 text-green-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
};

const getModuloLabel = (modulo: string) => {
  switch (modulo) {
    case 'media':
      return 'Mídia';
    case 'merchandising':
      return 'Merch';
    default:
      return 'Sistema';
  }
};

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notificacoes = [], isLoading } = useNotificacoes();
  const { data: naoLidas = 0 } = useNotificacoesNaoLidas();
  const marcarLida = useMarcarNotificacaoLida();
  const marcarTodasLidas = useMarcarTodasLidas();

  // Sort notifications: priority unread first, then by date
  const sortedNotificacoes = useMemo(() => {
    return [...notificacoes].sort((a, b) => {
      // Priority unread notifications first
      const aIsPriorityUnread = a.prioridade === 'alta' && !a.lida;
      const bIsPriorityUnread = b.prioridade === 'alta' && !b.lida;
      
      if (aIsPriorityUnread && !bIsPriorityUnread) return -1;
      if (bIsPriorityUnread && !aIsPriorityUnread) return 1;
      
      // Then by date
      return new Date(b.criada_em).getTime() - new Date(a.criada_em).getTime();
    });
  }, [notificacoes]);

  const handleNotificacaoClick = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      marcarLida.mutate(notificacao.id);
    }
    if (notificacao.url_acao) {
      navigate(notificacao.url_acao);
      setOpen(false);
    }
  };

  const handleMarcarTodasLidas = () => {
    marcarTodasLidas.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarcarTodasLidas}
              disabled={marcarTodasLidas.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : sortedNotificacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedNotificacoes.map((notificacao) => (
                <NotificacaoItem
                  key={notificacao.id}
                  notificacao={notificacao}
                  onClick={() => handleNotificacaoClick(notificacao)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface NotificacaoItemProps {
  notificacao: Notificacao;
  onClick: () => void;
}

function NotificacaoItem({ notificacao, onClick }: NotificacaoItemProps) {
  const isPriority = notificacao.prioridade === 'alta' && !notificacao.lida;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 hover:bg-muted/50 transition-colors',
        !notificacao.lida && 'bg-primary/5',
        isPriority && 'bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Priority Icon */}
        {isPriority && (
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn('text-xs', getModuloColor(notificacao.modulo))}
            >
              {getModuloLabel(notificacao.modulo)}
            </Badge>
            {isPriority && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                Prioritária
              </Badge>
            )}
            {!notificacao.lida && !isPriority && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="font-medium text-sm truncate">{notificacao.titulo}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {notificacao.mensagem}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notificacao.criada_em), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            {notificacao.url_acao && (
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
        {notificacao.lida && (
          <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
