import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useCreateContract } from '@/hooks/useCreateContract';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewContractDialog({ open, onOpenChange }: NewContractDialogProps) {
  const { data: outdoors } = useOutdoors();
  const createContract = useCreateContract();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    outdoorId: '',
    farmerName: '',
    farmerCpf: '',
    farmerPhone: '',
    farmerEmail: '',
    startDate: '',
    endDate: '',
    monthlyValue: '',
    paymentMethod: '' as 'cash' | 'fuel' | 'both' | '',
    autoRenewal: false,
    documentUrl: '',
    documentName: '',
  });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast.error('O arquivo deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `contracts/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      setFormData({ 
        ...formData, 
        documentUrl: publicUrl,
        documentName: file.name,
      });
      showToast.success('Documento enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast.error('Erro ao enviar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = () => {
    setFormData({ ...formData, documentUrl: '', documentName: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentMethod || !formData.outdoorId) return;

    await createContract.mutateAsync({
      outdoorId: formData.outdoorId,
      farmerName: formData.farmerName,
      farmerCpf: formData.farmerCpf,
      farmerPhone: formData.farmerPhone || undefined,
      farmerEmail: formData.farmerEmail || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      monthlyValue: parseFloat(formData.monthlyValue),
      paymentMethod: formData.paymentMethod,
      autoRenewal: formData.autoRenewal,
      documentUrl: formData.documentUrl || undefined,
    });
    
    onOpenChange(false);
    setFormData({
      outdoorId: '',
      farmerName: '',
      farmerCpf: '',
      farmerPhone: '',
      farmerEmail: '',
      startDate: '',
      endDate: '',
      monthlyValue: '',
      paymentMethod: '',
      autoRenewal: false,
      documentUrl: '',
      documentName: '',
    });
  };

  // Filter outdoors that don't have a contract
  const availableOutdoors = outdoors?.filter(o => !o.contractId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outdoorId">Outdoor</Label>
            <Select value={formData.outdoorId} onValueChange={(v) => setFormData({ ...formData, outdoorId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o outdoor" />
              </SelectTrigger>
              <SelectContent>
                {availableOutdoors.map(outdoor => (
                  <SelectItem key={outdoor.id} value={outdoor.id}>
                    {outdoor.code} - {outdoor.pdvName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    min="0"
                    value={formData.monthlyValue}
                    onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v as 'cash' | 'fuel' | 'both' })}>
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

          {/* Document Upload Section */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Contrato Assinado</h4>
            <div className="space-y-2">
              {formData.documentUrl ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{formData.documentName}</p>
                    <p className="text-xs text-muted-foreground">Documento anexado</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={handleRemoveDocument}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-2 pb-2">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Clique para enviar o contrato assinado</p>
                        <p className="text-xs text-muted-foreground">(PDF, DOC, JPG - máx. 10MB)</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createContract.isPending}>
              {createContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
