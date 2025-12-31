import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Hotel, Utensils, Fuel, Wrench, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useOperationalCosts, useUpdateOperationalCost, getOperationalCostValue } from '@/hooks/useOperationalCosts';

interface CostParameter {
  parametro: string;
  label: string;
  icon: React.ElementType;
  unidade: string;
  description: string;
}

const costParameters: CostParameter[] = [
  { parametro: 'hospedagem_diaria', label: 'Hospedagem Diária', icon: Hotel, unidade: 'R$/dia', description: 'Custo médio de hospedagem por técnico por dia' },
  { parametro: 'dias_servico_remoto', label: 'Dias p/ Serviço Remoto', icon: MapPin, unidade: 'dias', description: 'Dias padrão para serviços em locais distantes' },
  { parametro: 'alimentacao_diaria', label: 'Alimentação Diária', icon: Utensils, unidade: 'R$/dia', description: 'Vale-refeição por dia por pessoa' },
  { parametro: 'custo_por_km', label: 'Custo por Km', icon: Fuel, unidade: 'R$/km', description: 'Custo médio por km rodado' },
  { parametro: 'distancia_minima_hospedagem', label: 'Distância Mín. Hospedagem', icon: MapPin, unidade: 'km', description: 'Distância mínima para considerar hospedagem' },
  { parametro: 'quantidade_tecnicos', label: 'Técnicos por Serviço', icon: Users, unidade: 'pessoas', description: 'Quantidade padrão de técnicos por serviço' },
  { parametro: 'depreciacao_equipamentos', label: 'Depreciação Equipamentos', icon: Wrench, unidade: '%', description: 'Percentual de depreciação por serviço' },
  { parametro: 'seguros_licencas', label: 'Seguros e Licenças', icon: Wrench, unidade: '%', description: 'Percentual de seguros e licenças' },
  { parametro: 'margem_contingencia', label: 'Margem de Contingência', icon: Wrench, unidade: '%', description: 'Margem de segurança recomendada' },
];

export function OperationalCostsSettings() {
  const { data: costs = [], isLoading } = useOperationalCosts();
  const updateCost = useUpdateOperationalCost();
  const [values, setValues] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize values from fetched data
  useEffect(() => {
    if (costs.length > 0) {
      const initialValues: Record<string, number> = {};
      costs.forEach(cost => {
        initialValues[cost.parametro] = cost.valor;
      });
      setValues(initialValues);
    }
  }, [costs]);

  const handleChange = (parametro: string, value: string) => {
    setValues(prev => ({
      ...prev,
      [parametro]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(values).map(([parametro, valor]) => {
        const original = getOperationalCostValue(costs, parametro);
        if (original !== valor) {
          return updateCost.mutateAsync({ parametro, valor });
        }
        return Promise.resolve();
      });

      await Promise.all(updates);
      toast.success('Custos operacionais atualizados!');
    } catch (error) {
      console.error('Error saving operational costs:', error);
      toast.error('Erro ao salvar custos operacionais');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Custos Operacionais
          </CardTitle>
          <CardDescription>
            Configure os parâmetros de custos operacionais para cálculo automático de estimativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {costParameters.map((param) => {
              const Icon = param.icon;
              return (
                <div key={param.parametro} className="space-y-2">
                  <Label htmlFor={param.parametro} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {param.label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={param.parametro}
                      type="number"
                      step="0.01"
                      value={values[param.parametro] ?? ''}
                      onChange={(e) => handleChange(param.parametro, e.target.value)}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {param.unidade}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Custos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
