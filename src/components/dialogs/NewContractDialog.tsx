import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewContractDialog({ open, onOpenChange }: NewContractDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    outdoorCode: '',
    farmerName: '',
    farmerCpf: '',
    farmerPhone: '',
    farmerEmail: '',
    startDate: '',
    endDate: '',
    monthlyValue: '',
    paymentMethod: '',
    autoRenewal: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Contrato criado com sucesso!');
    setIsLoading(false);
    onOpenChange(false);
    setFormData({
      outdoorCode: '',
      farmerName: '',
      farmerCpf: '',
      farmerPhone: '',
      farmerEmail: '',
      startDate: '',
      endDate: '',
      monthlyValue: '',
      paymentMethod: '',
      autoRenewal: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outdoorCode">Código do Outdoor</Label>
            <Input
              id="outdoorCode"
              value={formData.outdoorCode}
              onChange={(e) => setFormData({ ...formData, outdoorCode: e.target.value })}
              placeholder="OUT-001"
              required
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Dados do Proprietário</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farmerName">Nome</Label>
                <Input
                  id="farmerName"
                  value={formData.farmerName}
                  onChange={(e) => setFormData({ ...formData, farmerName: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="farmerCpf">CPF</Label>
                  <Input
                    id="farmerCpf"
                    value={formData.farmerCpf}
                    onChange={(e) => setFormData({ ...formData, farmerCpf: e.target.value })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmerPhone">Telefone</Label>
                  <Input
                    id="farmerPhone"
                    value={formData.farmerPhone}
                    onChange={(e) => setFormData({ ...formData, farmerPhone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="farmerEmail">Email</Label>
                <Input
                  id="farmerEmail"
                  type="email"
                  value={formData.farmerEmail}
                  onChange={(e) => setFormData({ ...formData, farmerEmail: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Dados do Contrato</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyValue">Valor Mensal (R$)</Label>
                  <Input
                    id="monthlyValue"
                    type="number"
                    step="0.01"
                    value={formData.monthlyValue}
                    onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="fuel">Combustível</SelectItem>
                      <SelectItem value="both">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="autoRenewal" 
                  checked={formData.autoRenewal}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoRenewal: checked as boolean })}
                />
                <Label htmlFor="autoRenewal" className="cursor-pointer">Renovação automática</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
