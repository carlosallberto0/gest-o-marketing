import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useSuppliers, useCreateServiceOrder } from '@/hooks/useServiceOrders';

interface NewServiceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const serviceTypes = [
  { value: 'installation', label: 'Instalação' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'removal', label: 'Remoção' },
  { value: 'replacement', label: 'Substituição' },
];

export function NewServiceOrderDialog({ open, onOpenChange }: NewServiceOrderDialogProps) {
  const { data: outdoors = [] } = useOutdoors();
  const { data: suppliers = [] } = useSuppliers();
  const createServiceOrder = useCreateServiceOrder();

  const [formData, setFormData] = useState({
    outdoor_id: '',
    supplier_id: '',
    type: '' as 'installation' | 'maintenance' | 'removal' | 'replacement' | '',
    description: '',
    total_cost: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.outdoor_id || !formData.supplier_id || !formData.type) {
      return;
    }

    await createServiceOrder.mutateAsync({
      outdoor_id: formData.outdoor_id,
      supplier_id: formData.supplier_id,
      type: formData.type,
      description: formData.description,
      total_cost: parseFloat(formData.total_cost) || 0,
    });

    onOpenChange(false);
    setFormData({
      outdoor_id: '',
      supplier_id: '',
      type: '',
      description: '',
      total_cost: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outdoor">Outdoor</Label>
              <Select 
                value={formData.outdoor_id} 
                onValueChange={(v) => setFormData({ ...formData, outdoor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {outdoors.map(outdoor => (
                    <SelectItem key={outdoor.id} value={outdoor.id}>
                      {outdoor.code} - {outdoor.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Serviço</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_cost">Custo Total (R$)</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o serviço a ser realizado..."
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createServiceOrder.isPending}>
              {createServiceOrder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Ordem
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}