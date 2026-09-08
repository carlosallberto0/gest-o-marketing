import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, DollarSign, Save, Wrench, Package, Trash2, Building, LucideIcon, Settings } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { useSupplierPricing, useUpsertSupplierPricing, SupplierPricing } from '@/hooks/useSupplierPricing';
import { formatCurrency } from '@/lib/costCalculator';
import { useSystemOptions } from '@/hooks/useSystemOptions';

interface SupplierPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
}

// Helper to get icon for service type
const getIconForServiceType = (key: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    installation: Package,
    maintenance: Wrench,
    removal: Trash2,
    replacement: Package,
    construction: Building,
  };
  return iconMap[key] || Settings;
};

interface PricingForm {
  custo_base: number;
  custo_por_m2: number;
  custo_hora_trabalho: number;
  tempo_estimado_horas: number;
  observacoes: string;
  // Novos campos de produção
  custo_impressao_m2: number;
  custo_envio_base: number;
  inclui_material: boolean;
  custo_construcao_base: number;
  custo_construcao_m2: number;
}

const emptyForm: PricingForm = {
  custo_base: 0,
  custo_por_m2: 0,
  custo_hora_trabalho: 0,
  tempo_estimado_horas: 4,
  observacoes: '',
  custo_impressao_m2: 0,
  custo_envio_base: 0,
  inclui_material: false,
  custo_construcao_base: 0,
  custo_construcao_m2: 0,
};

export function SupplierPricingDialog({ 
  open, 
  onOpenChange, 
  supplierId, 
  supplierName 
}: SupplierPricingDialogProps) {
  const { data: pricing = [], isLoading: isLoadingPricing } = useSupplierPricing(supplierId);
  const { data: dynamicServiceTypes = [], isLoading: isLoadingTypes } = useSystemOptions('supplier_service_type');
  const upsertPricing = useUpsertSupplierPricing();
  
  const isLoading = isLoadingPricing || isLoadingTypes;

  // Convert dynamic options to component format
  const serviceTypes = useMemo(() => {
    return dynamicServiceTypes.map(opt => ({
      value: opt.option_key,
      label: opt.option_label,
      icon: getIconForServiceType(opt.option_key),
    }));
  }, [dynamicServiceTypes]);
  
  const [activeTab, setActiveTab] = useState('');
  const [forms, setForms] = useState<Record<string, PricingForm>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Set default active tab when service types load
  useEffect(() => {
    if (serviceTypes.length > 0 && !activeTab) {
      setActiveTab(serviceTypes[0].value);
    }
  }, [serviceTypes, activeTab]);

  // Initialize forms from fetched data
  useEffect(() => {
    if (serviceTypes.length === 0) return;
    
    const initialForms: Record<string, PricingForm> = {};
    serviceTypes.forEach(type => {
      const existing = pricing.find(p => p.service_type === type.value);
      if (existing) {
        initialForms[type.value] = {
          custo_base: existing.custo_base,
          custo_por_m2: existing.custo_por_m2,
          custo_hora_trabalho: existing.custo_hora_trabalho,
          tempo_estimado_horas: existing.tempo_estimado_horas,
          observacoes: existing.observacoes || '',
          custo_impressao_m2: existing.custo_impressao_m2 || 0,
          custo_envio_base: existing.custo_envio_base || 0,
          inclui_material: existing.inclui_material || false,
          custo_construcao_base: existing.custo_construcao_base || 0,
          custo_construcao_m2: existing.custo_construcao_m2 || 0,
        };
      } else {
        initialForms[type.value] = { ...emptyForm };
      }
    });
    setForms(initialForms);
  }, [pricing, serviceTypes]);

  const handleChange = (serviceType: string, field: keyof PricingForm, value: string | number | boolean) => {
    setForms(prev => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        [field]: field === 'observacoes' 
          ? value 
          : field === 'inclui_material' 
            ? value 
            : typeof value === 'string' ? parseFloat(value) || 0 : value,
      },
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(forms).map(([serviceType, form]) => {
        // Only save if there's actual data
        if (form.custo_base > 0 || form.custo_por_m2 > 0 || form.custo_hora_trabalho > 0) {
          return upsertPricing.mutateAsync({
            supplier_id: supplierId,
            service_type: serviceType,
            ...form,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updates);
      showToast.success('Preços salvos com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving pricing:', error);
      showToast.error('Erro ao salvar preços');
    } finally {
      setIsSaving(false);
    }
  };

  const currentForm = forms[activeTab] || emptyForm;

  // Calculate preview
  const previewArea = 50; // Example: 50m²
  const previewHours = currentForm.tempo_estimado_horas;
  const previewTotal = currentForm.custo_base + 
    (previewArea * currentForm.custo_por_m2) + 
    (previewHours * currentForm.custo_hora_trabalho);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tabela de Preços - {supplierName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${serviceTypes.length <= 5 ? `grid-cols-${serviceTypes.length}` : 'grid-cols-5 overflow-x-auto'}`} style={{ gridTemplateColumns: `repeat(${Math.min(serviceTypes.length, 5)}, minmax(0, 1fr))` }}>
              {serviceTypes.map(type => {
                const Icon = type.icon;
                return (
                  <TabsTrigger key={type.value} value={type.value} className="text-xs">
                    <Icon className="h-3 w-3 mr-1" />
                    {type.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {serviceTypes.map(type => {
              const form = forms[type.value] || emptyForm;
              const previewConstrucao = type.value === 'installation' || type.value === 'construction'
                ? form.custo_construcao_base + (previewArea * form.custo_construcao_m2)
                : 0;
              const previewServico = form.custo_base + (previewArea * form.custo_por_m2) + (form.tempo_estimado_horas * form.custo_hora_trabalho);
              const previewProducao = form.custo_impressao_m2 * previewArea;
              const previewEnvio = form.custo_envio_base;
              const previewTotalCompleto = previewServico + previewConstrucao + previewProducao + previewEnvio;
              
              return (
              <TabsContent key={type.value} value={type.value} className="space-y-4 mt-4">
                {/* Custos Básicos do Serviço */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Custos do Serviço</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${type.value}-base`}>Custo Base (R$)</Label>
                      <Input
                        id={`${type.value}-base`}
                        type="number"
                        step="0.01"
                        value={form.custo_base}
                        onChange={(e) => handleChange(type.value, 'custo_base', e.target.value)}
                        placeholder="0,00"
                      />
                      <p className="text-xs text-muted-foreground">Valor fixo do serviço</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${type.value}-m2`}>Custo por m² (R$)</Label>
                      <Input
                        id={`${type.value}-m2`}
                        type="number"
                        step="0.01"
                        value={form.custo_por_m2}
                        onChange={(e) => handleChange(type.value, 'custo_por_m2', e.target.value)}
                        placeholder="0,00"
                      />
                      <p className="text-xs text-muted-foreground">Proporcional à área do outdoor</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${type.value}-hora`}>Custo Hora Trabalho (R$)</Label>
                      <Input
                        id={`${type.value}-hora`}
                        type="number"
                        step="0.01"
                        value={form.custo_hora_trabalho}
                        onChange={(e) => handleChange(type.value, 'custo_hora_trabalho', e.target.value)}
                        placeholder="0,00"
                      />
                      <p className="text-xs text-muted-foreground">Mão de obra por hora</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${type.value}-tempo`}>Tempo Estimado (horas)</Label>
                      <Input
                        id={`${type.value}-tempo`}
                        type="number"
                        step="0.5"
                        value={form.tempo_estimado_horas}
                        onChange={(e) => handleChange(type.value, 'tempo_estimado_horas', e.target.value)}
                        placeholder="4"
                      />
                      <p className="text-xs text-muted-foreground">Duração média do serviço</p>
                    </div>
                  </div>
                </div>

                {/* Custos de Construção (apenas para instalação/construção) */}
                {(type.value === 'installation' || type.value === 'construction') && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Construção do Outdoor</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${type.value}-construcao-base`}>Custo Base Construção (R$)</Label>
                        <Input
                          id={`${type.value}-construcao-base`}
                          type="number"
                          step="0.01"
                          value={form.custo_construcao_base}
                          onChange={(e) => handleChange(type.value, 'custo_construcao_base', e.target.value)}
                          placeholder="0,00"
                        />
                        <p className="text-xs text-muted-foreground">Valor fixo para construir estrutura</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${type.value}-construcao-m2`}>Custo Construção por m² (R$)</Label>
                        <Input
                          id={`${type.value}-construcao-m2`}
                          type="number"
                          step="0.01"
                          value={form.custo_construcao_m2}
                          onChange={(e) => handleChange(type.value, 'custo_construcao_m2', e.target.value)}
                          placeholder="0,00"
                        />
                        <p className="text-xs text-muted-foreground">Proporcional à área da estrutura</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custos de Produção */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Produção e Envio</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${type.value}-impressao`}>Impressão da Lona (R$/m²)</Label>
                      <Input
                        id={`${type.value}-impressao`}
                        type="number"
                        step="0.01"
                        value={form.custo_impressao_m2}
                        onChange={(e) => handleChange(type.value, 'custo_impressao_m2', e.target.value)}
                        placeholder="0,00"
                      />
                      <p className="text-xs text-muted-foreground">Se 0, usa custo global</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${type.value}-envio`}>Custo Base Envio (R$)</Label>
                      <Input
                        id={`${type.value}-envio`}
                        type="number"
                        step="0.01"
                        value={form.custo_envio_base}
                        onChange={(e) => handleChange(type.value, 'custo_envio_base', e.target.value)}
                        placeholder="0,00"
                      />
                      <p className="text-xs text-muted-foreground">Se 0, usa custo global</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id={`${type.value}-material`}
                      checked={form.inclui_material}
                      onCheckedChange={(checked) => handleChange(type.value, 'inclui_material', checked === true)}
                    />
                    <Label htmlFor={`${type.value}-material`} className="text-sm">
                      Fornecedor inclui material (lona) no preço
                    </Label>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor={`${type.value}-obs`}>Observações</Label>
                  <Textarea
                    id={`${type.value}-obs`}
                    value={form.observacoes}
                    onChange={(e) => handleChange(type.value, 'observacoes', e.target.value)}
                    placeholder="Informações adicionais sobre precificação..."
                    rows={2}
                  />
                </div>

                {/* Preview Completo */}
                <Card className="bg-muted/50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Simulação de Custo</CardTitle>
                    <CardDescription className="text-xs">
                      Exemplo para outdoor de {previewArea}m²
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serviço (base + área + mão de obra)</span>
                        <span className="font-medium">{formatCurrency(previewServico)}</span>
                      </div>
                      {previewConstrucao > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Construção</span>
                          <span className="font-medium">{formatCurrency(previewConstrucao)}</span>
                        </div>
                      )}
                      {previewProducao > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Impressão ({previewArea}m²)</span>
                          <span className="font-medium">{formatCurrency(previewProducao)}</span>
                        </div>
                      )}
                      {previewEnvio > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Envio Base</span>
                          <span className="font-medium">{formatCurrency(previewEnvio)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Total Fornecedor</span>
                        <span className="font-bold text-primary">{formatCurrency(previewTotalCompleto)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )})}
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving || isLoading}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Preços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
