import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewPDVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPDVDialog({ open, onOpenChange }: NewPDVDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: '',
    address: '',
    city: '',
    state: '',
    modules: [] as string[],
  });

  const handleModuleChange = (module: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, modules: [...formData.modules, module] });
    } else {
      setFormData({ ...formData, modules: formData.modules.filter(m => m !== module) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('PDV criado com sucesso!');
    setIsLoading(false);
    onOpenChange(false);
    setFormData({
      code: '',
      name: '',
      type: '',
      address: '',
      city: '',
      state: '',
      modules: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo PDV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="PDV-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="posto">Posto</SelectItem>
                  <SelectItem value="conveniencia">Conveniência</SelectItem>
                  <SelectItem value="both">Posto + Conveniência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome do PDV</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do ponto de venda"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="UF"
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Módulos Ativos</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="module-merchandising" 
                  checked={formData.modules.includes('merchandising')}
                  onCheckedChange={(checked) => handleModuleChange('merchandising', checked as boolean)}
                />
                <Label htmlFor="module-merchandising" className="cursor-pointer">Merchandising</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="module-media" 
                  checked={formData.modules.includes('media')}
                  onCheckedChange={(checked) => handleModuleChange('media', checked as boolean)}
                />
                <Label htmlFor="module-media" className="cursor-pointer">Mídia Externa</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar PDV
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
