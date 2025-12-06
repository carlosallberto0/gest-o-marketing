import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useUpdateContract } from '@/hooks/useContracts';

interface Contract {
  id: string;
  outdoor_id: string;
  farmer_name: string;
  farmer_cpf: string;
  farmer_phone: string | null;
  farmer_email: string | null;
  start_date: string;
  end_date: string;
  monthly_value: number;
  payment_method: 'cash' | 'fuel' | 'both';
  auto_renewal: boolean;
  status: string;
  outdoors?: {
    code: string;
  };
}

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
}

export function EditContractDialog({ open, onOpenChange, contract }: EditContractDialogProps) {
  const updateContract = useUpdateContract();
  
  const [formData, setFormData] = useState({
    farmerName: '',
    farmerCpf: '',
    farmerPhone: '',
    farmerEmail: '',
    startDate: '',
    endDate: '',
    monthlyValue: '',
    paymentMethod: 'cash' as 'cash' | 'fuel' | 'both',
    autoRenewal: false,
    status: 'active',
  });

  useEffect(() => {
    if (contract) {
      setFormData({
        farmerName: contract.farmer_name,
        farmerCpf: contract.farmer_cpf,
        farmerPhone: contract.farmer_phone || '',
        farmerEmail: contract.farmer_email || '',
        startDate: contract.start_date,
        endDate: contract.end_date,
        monthlyValue: contract.monthly_value.toString(),
        paymentMethod: contract.payment_method,
        autoRenewal: contract.auto_renewal,
        status: contract.status,
      });
    }
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    await updateContract.mutateAsync({
      id: contract.id,
      farmerName: formData.farmerName,
      farmerCpf: formData.farmerCpf,
      farmerPhone: formData.farmerPhone || null,
      farmerEmail: formData.farmerEmail || null,
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthlyValue: parseFloat(formData.monthlyValue),
      paymentMethod: formData.paymentMethod,
      autoRenewal: formData.autoRenewal,
      status: formData.status,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Contrato {contract?.outdoors?.code}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Dados do Proprietário</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmerName">Nome</Label>
                <Input
                  id="farmerName"
                  value={formData.farmerName}
                  onChange={(e) => setFormData({ ...formData, farmerName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmerCpf">CPF</Label>
                <Input
                  id="farmerCpf"
                  value={formData.farmerCpf}
                  onChange={(e) => setFormData({ ...formData, farmerCpf: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmerPhone">Telefone</Label>
                <Input
                  id="farmerPhone"
                  value={formData.farmerPhone}
                  onChange={(e) => setFormData({ ...formData, farmerPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmerEmail">E-mail</Label>
                <Input
                  id="farmerEmail"
                  type="email"
                  value={formData.farmerEmail}
                  onChange={(e) => setFormData({ ...formData, farmerEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Dados do Contrato</h4>
            
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
                  min="0"
                  value={formData.monthlyValue}
                  onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(v: 'cash' | 'fuel' | 'both') => setFormData({ ...formData, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="fuel">Combustível</SelectItem>
                    <SelectItem value="both">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expiring">Vencendo</SelectItem>
                    <SelectItem value="expired">Vencido</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Renovação Automática</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={formData.autoRenewal}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoRenewal: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.autoRenewal ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateContract.isPending}>
              {updateContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
