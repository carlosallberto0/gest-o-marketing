import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Merge } from 'lucide-react';
import { useRoutes, useUnifyRoutes } from '@/hooks/useRoutes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnifyRoutesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnifyRoutesDialog({ open, onOpenChange }: UnifyRoutesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: routes = [] } = useRoutes();
  const unifyRoutes = useUnifyRoutes();

  const activeRoutes = routes.filter(r => r.status === 'active' || r.status === 'draft');

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleUnify = () => {
    if (selected.size < 2) return;
    unifyRoutes.mutate(Array.from(selected), {
      onSuccess: () => {
        onOpenChange(false);
        setSelected(new Set());
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Unificar Rotas
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecione 2 ou mais rotas para consolidar em uma única rota otimizada.
        </p>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {activeRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma rota ativa disponível</p>
          ) : (
            activeRoutes.map(route => (
              <div key={route.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50">
                <Checkbox checked={selected.has(route.id)} onCheckedChange={() => toggle(route.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{route.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {route.total_distance_km} km • Criada em {format(new Date(route.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {route.type === 'auto' ? 'Auto' : route.type === 'manual' ? 'Manual' : 'Unificada'}
                </Badge>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleUnify} disabled={selected.size < 2 || unifyRoutes.isPending}>
            {unifyRoutes.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Unificar ({selected.size} rotas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
