import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OutdoorMultiSelect } from '@/components/ui/outdoor-multi-select';
import { MultiPhotoUpload } from '@/components/ui/photo-upload';
import { Loader2 } from 'lucide-react';
import { useUpdateContract } from '@/hooks/useContracts';
import { useSystemOptions } from '@/hooks/useSystemOptions';
import { useOutdoors } from '@/hooks/useOutdoorData';

interface ContractOutdoor {
  outdoor: {
    id: string;
    code: string;
    location: string;
    pdvs: {
      name: string;
    } | null;
  };
}

interface ContractImage {
  id: string;
  image_url: string;
  page_order: number;
}

interface Contract {
  id: string;
  outdoor_id: string | null;
  farmer_name: string;
  farmer_cpf: string;
  farmer_phone: string | null;
  farmer_email: string | null;
  start_date: string;
  end_date: string;
  monthly_value: number;
  payment_method: string;
  auto_renewal: boolean;
  status: string;
  contract_outdoors?: ContractOutdoor[];
  contract_images?: ContractImage[];
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
  const { data: paymentOptions = [] } = useSystemOptions('contract_payment_method');
  const { data: allOutdoors = [] } = useOutdoors();
  
  const [formData, setFormData] = useState({
    farmerName: '',
    farmerCpf: '',
    farmerPhone: '',
    farmerEmail: '',
    startDate: '',
    endDate: '',
    monthlyValue: '',
    paymentMethod: '',
    autoRenewal: false,
    status: 'active',
    outdoorIds: [] as string[],
    contractImages: [] as string[],
  });

  useEffect(() => {
    if (contract) {
      // Get outdoor IDs from contract_outdoors or fallback to outdoor_id
      let outdoorIds: string[] = [];
      if (contract.contract_outdoors && contract.contract_outdoors.length > 0) {
        outdoorIds = contract.contract_outdoors.map(co => co.outdoor.id);
      } else if (contract.outdoor_id) {
        outdoorIds = [contract.outdoor_id];
      }

      // Get image URLs from contract_images
      const imageUrls = contract.contract_images
        ?.sort((a, b) => a.page_order - b.page_order)
        .map(img => img.image_url) || [];

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
        outdoorIds,
        contractImages: imageUrls,
      });
    }
  }, [contract]);

  const availableOutdoors = useMemo(() => {
    return allOutdoors.map(o => ({
      id: o.id,
      code: o.code,
      pdvName: o.pdvName,
      location: o.location,
      hasContract: !!o.contractId && o.contractId !== contract?.id,
    }));
  }, [allOutdoors, contract?.id]);

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
      outdoorIds: formData.outdoorIds,
      imageUrls: formData.contractImages,
    });

    onOpenChange(false);
  };

  // Get display title
  const getTitle = () => {
    if (contract?.contract_outdoors && contract.contract_outdoors.length > 0) {
      const codes = contract.contract_outdoors.map(co => co.outdoor.code).join(', ');
      return `Editar Contrato - ${codes}`;
    }
    if (contract?.outdoors?.code) {
      return `Editar Contrato ${contract.outdoors.code}`;
    }
    return 'Editar Contrato';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {/* Outdoor Selection */}
            <div className="space-y-2">
              <Label>Outdoors Vinculados</Label>
              <OutdoorMultiSelect
                outdoors={availableOutdoors}
                value={formData.outdoorIds}
                onValueChange={(ids) => setFormData({ ...formData, outdoorIds: ids })}
                placeholder="Buscar e selecionar outdoors..."
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm text-muted-foreground">Dados do Proprietário</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm text-muted-foreground">Dados do Contrato</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentOptions.length > 0 ? (
                        paymentOptions.map(option => (
                          <SelectItem key={option.id} value={option.option_key}>
                            {option.option_label}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="fuel">Combustível</SelectItem>
                          <SelectItem value="both">Misto</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Contract Images */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm text-muted-foreground">Páginas do Contrato</h4>
              <MultiPhotoUpload
                value={formData.contractImages}
                onChange={(photos) => setFormData({ ...formData, contractImages: photos })}
                maxPhotos={10}
                folder="contracts"
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateContract.isPending}>
            {updateContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
