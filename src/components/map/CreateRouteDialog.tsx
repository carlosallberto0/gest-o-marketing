import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Route } from 'lucide-react';
import { useCreateManualRoute } from '@/hooks/useRoutes';
import { useSuppliers } from '@/hooks/useSuppliers';

interface OutdoorOption {
  id: string;
  code: string;
  location: string;
  status: string;
  pdvName: string;
}

interface CreateRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outdoors: OutdoorOption[];
}

export function CreateRouteDialog({ open, onOpenChange, outdoors }: CreateRouteDialogProps) {
  const [name, setName] = useState('');
  const [selectedOutdoors, setSelectedOutdoors] = useState<Set<string>>(new Set());
  const [supplierId, setSupplierId] = useState<string>('');
  const [search, setSearch] = useState('');

  const createRoute = useCreateManualRoute();
  const { data: suppliers = [] } = useSuppliers();

  const filteredOutdoors = outdoors.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.code.toLowerCase().includes(s) || o.location.toLowerCase().includes(s) || o.pdvName.toLowerCase().includes(s);
  });

  const toggleOutdoor = (id: string) => {
    setSelectedOutdoors(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSubmit = () => {
    if (!name.trim() || selectedOutdoors.size === 0) return;
    createRoute.mutate(
      { name, outdoorIds: Array.from(selectedOutdoors), supplierId: supplierId || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setSelectedOutdoors(new Set());
          setSupplierId('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Criar Rota Manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da Rota</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Rota GO Norte" />
          </div>

          <div>
            <Label>Fornecedor (opcional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Outdoors ({selectedOutdoors.size} selecionado(s))</Label>
            </div>
            <Input
              placeholder="Buscar outdoor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <ScrollArea className="h-[250px] border rounded-md p-2">
              {filteredOutdoors.map(o => (
                <div key={o.id} className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded">
                  <Checkbox
                    checked={selectedOutdoors.has(o.id)}
                    onCheckedChange={() => toggleOutdoor(o.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{o.code}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {o.pdvName} — {o.location}
                    </p>
                  </div>
                  <Badge variant={o.status === 'non_operational' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {o.status === 'non_operational' ? 'Não Op.' : o.status === 'pending_evaluation' ? 'Pendente' : 'OK'}
                  </Badge>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || selectedOutdoors.size === 0 || createRoute.isPending}>
            {createRoute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Rota ({selectedOutdoors.size} pontos)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
