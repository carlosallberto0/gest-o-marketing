import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calculator, AlertTriangle } from 'lucide-react';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useSuppliers, useCreateServiceOrder } from '@/hooks/useServiceOrders';
import { useCostEstimate } from '@/hooks/useCostEstimate';
import { formatCurrency } from '@/lib/costCalculator';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  const { profile } = useAuth();
  const { data: outdoors = [] } = useOutdoors();
  const { data: suppliers = [] } = useSuppliers();
  const createServiceOrder = useCreateServiceOrder();

  const isSuperAdmin = profile?.role === 'super_admin';
  const isDirector = profile?.role === 'director';
  const canEditCost = isSuperAdmin;
  const canSeeDetails = isSuperAdmin || isDirector;

  const [formData, setFormData] = useState({
    outdoor_id: '',
    supplier_id: '',
    type: '' as 'installation' | 'maintenance' | 'removal' | 'replacement' | '',
    description: '',
    total_cost: '',
  });

  // Get selected outdoor details
  const selectedOutdoor = useMemo(() => 
    outdoors.find(o => o.id === formData.outdoor_id),
    [outdoors, formData.outdoor_id]
  );

  // Get state from outdoor's PDV - we need to handle the joined data structure
  const outdoorState = useMemo(() => {
    if (!selectedOutdoor) return 'SP';
    // The outdoor object might have pdv data from a join
    const outdoor = selectedOutdoor as any;
    return outdoor.pdv?.state || outdoor.pdvs?.state || 'SP';
  }, [selectedOutdoor]);

  // Calculate cost estimate
  const { costBreakdown, visibleCosts, isLoading: isCalculating } = useCostEstimate({
    supplierId: formData.supplier_id,
    serviceType: formData.type,
    area: selectedOutdoor?.area || 0,
    distancia: 50, // Default distance - could be calculated from outdoor location
    estado: outdoorState,
    duracaoDias: 1,
  });

  // Update total cost when estimate changes
  useEffect(() => {
    if (costBreakdown && !formData.total_cost) {
      setFormData(prev => ({
        ...prev,
        total_cost: costBreakdown.total_estimado.toFixed(2)
      }));
    }
  }, [costBreakdown, formData.total_cost]);

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
      total_cost: parseFloat(formData.total_cost) || costBreakdown?.total_estimado || 0,
      custo_fornecedor: costBreakdown?.custo_fornecedor,
      custos_operacionais: costBreakdown?.custos_operacionais,
      multiplicador_regional: costBreakdown?.multiplicador_regional,
      detalhamento_custos: costBreakdown?.detalhamento as Record<string, unknown>,
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

  const showEstimate = formData.outdoor_id && formData.supplier_id && formData.type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outdoor">Outdoor</Label>
              <Select 
                value={formData.outdoor_id} 
                onValueChange={(v) => setFormData({ ...formData, outdoor_id: v, total_cost: '' })}
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
                onValueChange={(v) => setFormData({ ...formData, supplier_id: v, total_cost: '' })}
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

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Serviço</Label>
            <Select 
              value={formData.type} 
              onValueChange={(v) => setFormData({ ...formData, type: v as typeof formData.type, total_cost: '' })}
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

          {/* Cost Estimate Section */}
          {showEstimate && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Estimativa de Custo
                  {isCalculating && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {costBreakdown ? (
                  <>
                    {/* Super Admin sees full breakdown */}
                    {isSuperAdmin && (
                      <div className="space-y-2 text-sm">
                        {/* Material e Produção */}
                        {(costBreakdown.detalhamento.material.custo_lona > 0 || 
                          costBreakdown.detalhamento.producao.total > 0 || 
                          costBreakdown.detalhamento.envio.total > 0) && (
                          <>
                            <div className="flex justify-between text-muted-foreground text-xs font-medium pt-1">
                              <span>MATERIAL E PRODUÇÃO</span>
                            </div>
                            {costBreakdown.detalhamento.material.custo_lona > 0 && (
                              <div className="flex justify-between pl-2">
                                <span className="text-muted-foreground">Lona ({costBreakdown.detalhamento.material.fonte})</span>
                                <span>{formatCurrency(costBreakdown.detalhamento.material.custo_lona)}</span>
                              </div>
                            )}
                            {costBreakdown.detalhamento.producao.total > 0 && (
                              <div className="flex justify-between pl-2">
                                <span className="text-muted-foreground">Impressão</span>
                                <span>{formatCurrency(costBreakdown.detalhamento.producao.total)}</span>
                              </div>
                            )}
                            {costBreakdown.detalhamento.envio.total > 0 && (
                              <div className="flex justify-between pl-2">
                                <span className="text-muted-foreground">Envio</span>
                                <span>{formatCurrency(costBreakdown.detalhamento.envio.total)}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Fornecedor */}
                        <div className="flex justify-between text-muted-foreground text-xs font-medium pt-2">
                          <span>SERVIÇO DO FORNECEDOR</span>
                          <span>{formatCurrency(costBreakdown.custo_fornecedor)}</span>
                        </div>
                        <div className="pl-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Base</span>
                            <span>{formatCurrency(costBreakdown.detalhamento.fornecedor.custo_base)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Área ({selectedOutdoor?.area || 0}m²)</span>
                            <span>{formatCurrency(costBreakdown.detalhamento.fornecedor.custo_area)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mão de obra</span>
                            <span>{formatCurrency(costBreakdown.detalhamento.fornecedor.custo_mao_obra)}</span>
                          </div>
                          {costBreakdown.detalhamento.fornecedor.custo_construcao > 0 && (
                            <div className="flex justify-between">
                              <span>Construção</span>
                              <span>{formatCurrency(costBreakdown.detalhamento.fornecedor.custo_construcao)}</span>
                            </div>
                          )}
                        </div>

                        {/* Operacionais */}
                        <div className="flex justify-between text-muted-foreground text-xs font-medium pt-2">
                          <span>CUSTOS OPERACIONAIS</span>
                          <span>{formatCurrency(costBreakdown.custos_operacionais)}</span>
                        </div>
                        <div className="pl-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Hospedagem</span>
                            <span>{formatCurrency(costBreakdown.detalhamento.operacionais.hospedagem)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Alimentação</span>
                            <span>{formatCurrency(costBreakdown.detalhamento.operacionais.alimentacao)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Combustível</span>
                            <span>{formatCurrency(costBreakdown.detalhamento.operacionais.combustivel)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-muted-foreground">
                            Multiplicador ({costBreakdown.detalhamento.regional.estado})
                          </span>
                          <span>{costBreakdown.multiplicador_regional}x</span>
                        </div>

                        <div className="border-t pt-2 flex justify-between">
                          <span className="font-medium">TOTAL ESTIMADO</span>
                          <span className="font-bold text-primary">{formatCurrency(costBreakdown.total_estimado)}</span>
                        </div>
                      </div>
                    )}

                    {/* Director sees totals only */}
                    {isDirector && !isSuperAdmin && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fornecedor</span>
                          <span className="font-medium">{formatCurrency(costBreakdown.custo_fornecedor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Operacionais</span>
                          <span className="font-medium">{formatCurrency(costBreakdown.custos_operacionais)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                          <span className="font-medium">TOTAL</span>
                          <span className="font-bold text-primary">{formatCurrency(costBreakdown.total_estimado)}</span>
                        </div>
                      </div>
                    )}

                    {/* Manager/Collaborator sees only approved total */}
                    {!canSeeDetails && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Estimativa Aprovada</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(costBreakdown.total_estimado)}
                        </span>
                      </div>
                    )}

                    {/* Atypical cost warning */}
                    {visibleCosts.alertas && visibleCosts.alertas.length > 0 && (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Atenção</span>
                        </div>
                        {visibleCosts.alertas.map((alerta, idx) => (
                          <p key={idx} className="text-xs text-warning/80 mt-1">{alerta.message}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Configure o preço do fornecedor para este tipo de serviço
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_cost">Custo Total (R$)</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                placeholder="0,00"
                readOnly={!canEditCost}
                className={cn(!canEditCost && "bg-muted")}
              />
              {!canEditCost && (
                <p className="text-xs text-muted-foreground">Valor calculado automaticamente</p>
              )}
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
