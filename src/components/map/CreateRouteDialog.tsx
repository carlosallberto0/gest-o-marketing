import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Route, FileText } from 'lucide-react';
import { useCreateManualRoute } from '@/hooks/useRoutes';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierWorkOrders } from '@/hooks/useSupplierWorkOrders';

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
  const [onlyFromOS, setOnlyFromOS] = useState(false);

  const createRoute = useCreateManualRoute();
  const { data: suppliers = [] } = useSuppliers();
  const { data: workOrders = [] } = useSupplierWorkOrders();

  // Get outdoor IDs from active work orders of selected supplier
  const osOutdoorIds = useMemo(() => {
    if (!supplierId) return new Set<string>();
    const ids = new Set<string>();
    workOrders
      .filter(wo => wo.supplier_id === supplierId && (wo.status === 'pending' || wo.status === 'in_progress'))
      .forEach(wo => {
        wo.items?.forEach(item => {
          if (item.outdoor_id) ids.add(item.outdoor_id);
        });
      });
    return ids;
  }, [supplierId, workOrders]);

  // When supplier changes, pre-select OS outdoors and enable filter
  useEffect(() => {
    if (supplierId && osOutdoorIds.size > 0) {
      setSelectedOutdoors(new Set(osOutdoorIds));
      setOnlyFromOS(true);
    } else {
      setOnlyFromOS(false);
    }
  }, [supplierId, osOutdoorIds]);

  const filteredOutdoors = useMemo(() => {
    let list = outdoors;
    
    // Filter by OS if toggle is on
    if (onlyFromOS && supplierId) {
      list = list.filter(o => osOutdoorIds.has(o.id));
    }

    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(o =>
      o.code.toLowerCase().includes(s) || o.location.toLowerCase().includes(s) || o.pdvName.toLowerCase().includes(s)
    );
  }, [outdoors, search, onlyFromOS, supplierId, osOutdoorIds]);

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
          setSearch('');
          setOnlyFromOS(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Route className="h-5 w-5 shrink-0" />
            <span className="truncate">Criar Rota Manual</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome da Rota</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Rota GO Norte" className="h-9" />
          </div>

          <div>
            <Label className="text-xs">Fornecedor (opcional)</Label>
            <Select value={supplierId || 'none'} onValueChange={(v) => setSupplierId(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* OS Filter toggle - only shown when supplier has active work orders */}
          {supplierId && osOutdoorIds.size > 0 && (
            <div className="flex items-center justify-between p-2 rounded-md bg-accent/30 border">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-xs truncate">Apenas outdoors da OS ativa ({osOutdoorIds.size})</span>
              </div>
              <Switch checked={onlyFromOS} onCheckedChange={setOnlyFromOS} />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">Outdoors ({selectedOutdoors.size} selecionado{selectedOutdoors.size !== 1 ? 's' : ''})</Label>
            </div>
            <Input
              placeholder="Buscar outdoor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-9"
            />
            <ScrollArea className="h-[40vh] sm:h-[250px] border rounded-md p-1.5">
              {filteredOutdoors.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum outdoor encontrado</p>
              ) : (
                filteredOutdoors.map(o => (
                  <div key={o.id} className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded">
                    <Checkbox
                      checked={selectedOutdoors.has(o.id)}
                      onCheckedChange={() => toggleOutdoor(o.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.code}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 inline mr-1 shrink-0" />
                        {o.pdvName} — {o.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {osOutdoorIds.has(o.id) && (
                        <Badge variant="default" className="text-[9px] px-1 py-0">OS</Badge>
                      )}
                      <Badge variant={o.status === 'non_operational' ? 'destructive' : 'secondary'} className="text-[9px] px-1 py-0">
                        {o.status === 'non_operational' ? 'Não Op.' : o.status === 'pending_evaluation' ? 'Pend.' : 'OK'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || selectedOutdoors.size === 0 || createRoute.isPending} className="w-full sm:w-auto">
            {createRoute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Rota ({selectedOutdoors.size} pontos)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
