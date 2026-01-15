import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OutdoorMultiSelect } from '@/components/ui/outdoor-multi-select';
import { MultiPhotoUpload } from '@/components/ui/photo-upload';
import { Loader2, AlertCircle } from 'lucide-react';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useCreateContract } from '@/hooks/useCreateContract';
import { useSystemOptions } from '@/hooks/useSystemOptions';
import { useDraftContract } from '@/hooks/useDraftContract';
import { showToast } from '@/lib/toast';

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialFormData = {
  outdoorIds: [] as string[],
  farmerName: '',
  farmerCpf: '',
  farmerPhone: '',
  farmerEmail: '',
  startDate: '',
  endDate: '',
  monthlyValue: '',
  paymentMethod: '',
  autoRenewal: false,
  contractImages: [] as string[],
};

export function NewContractDialog({ open, onOpenChange }: NewContractDialogProps) {
  const { data: outdoors } = useOutdoors();
  const { data: paymentOptions = [] } = useSystemOptions('contract_payment_method');
  const createContract = useCreateContract();
  const { showRecoveryPrompt, saveDraft, loadDraft, clearDraft, recoverDraft, dismissRecovery } = useDraftContract();
  
  const [formData, setFormData] = useState(initialFormData);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);

  // Check for draft when dialog opens
  useEffect(() => {
    if (open && showRecoveryPrompt) {
      setShowRecoveryBanner(true);
    }
  }, [open, showRecoveryPrompt]);

  // Auto-save draft on form changes (debounced)
  useEffect(() => {
    if (!open) return;
    
    const hasData = formData.farmerName || formData.outdoorIds.length > 0 || formData.monthlyValue;
    if (hasData) {
      const timeout = setTimeout(() => {
        saveDraft(formData);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [formData, open, saveDraft]);

  const handleRecoverDraft = useCallback(() => {
    const draft = recoverDraft();
    if (draft) {
      setFormData({
        outdoorIds: draft.outdoorIds || draft.outdoorId ? [draft.outdoorId] : [],
        farmerName: draft.farmerName || '',
        farmerCpf: draft.farmerCpf || '',
        farmerPhone: draft.farmerPhone || '',
        farmerEmail: draft.farmerEmail || '',
        startDate: draft.startDate || '',
        endDate: draft.endDate || '',
        monthlyValue: draft.monthlyValue || '',
        paymentMethod: draft.paymentMethod || '',
        autoRenewal: draft.autoRenewal || false,
        contractImages: draft.contractImages || [],
      });
    }
    setShowRecoveryBanner(false);
  }, [recoverDraft]);

  const handleDismissRecovery = useCallback(() => {
    dismissRecovery();
    setShowRecoveryBanner(false);
  }, [dismissRecovery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentMethod || formData.outdoorIds.length === 0) {
      showToast.error('Selecione pelo menos um outdoor');
      return;
    }

    await createContract.mutateAsync({
      outdoorIds: formData.outdoorIds,
      farmerName: formData.farmerName,
      farmerCpf: formData.farmerCpf,
      farmerPhone: formData.farmerPhone || undefined,
      farmerEmail: formData.farmerEmail || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthlyValue: parseFloat(formData.monthlyValue),
      paymentMethod: formData.paymentMethod,
      autoRenewal: formData.autoRenewal,
      imageUrls: formData.contractImages.length > 0 ? formData.contractImages : undefined,
    });
    
    clearDraft();
    onOpenChange(false);
    setFormData(initialFormData);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Don't clear the draft when closing - allow recovery later
    }
    onOpenChange(isOpen);
  };

  // Show ALL outdoors, with visual indicator for those with contracts
  const availableOutdoors = (outdoors || []).map(o => ({
    id: o.id,
    code: o.code,
    pdvName: o.pdvName,
    location: o.location,
    hasContract: !!o.contractId,
  }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          {/* Recovery Banner */}
          {showRecoveryBanner && (
            <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg mb-4">
              <AlertCircle className="h-5 w-5 text-warning shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-warning">Rascunho encontrado</p>
                <p className="text-muted-foreground">Deseja recuperar os dados preenchidos anteriormente?</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDismissRecovery}>
                  Descartar
                </Button>
                <Button size="sm" onClick={handleRecoverDraft}>
                  Recuperar
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pb-6">
            <div className="space-y-2">
              <Label>Outdoors Vinculados</Label>
              <OutdoorMultiSelect
                outdoors={availableOutdoors}
                value={formData.outdoorIds}
                onValueChange={(ids) => setFormData({ ...formData, outdoorIds: ids })}
                placeholder="Buscar e selecionar outdoors..."
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Contract Images Upload Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Páginas do Contrato (Imagens)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Fotografe ou selecione as páginas do contrato assinado. Formatos aceitos: JPG, PNG.
              </p>
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
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createContract.isPending || formData.outdoorIds.length === 0 || !formData.paymentMethod}
          >
            {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Contrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
