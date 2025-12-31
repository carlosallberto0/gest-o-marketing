import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Hotel, Utensils, Fuel, Wrench, Users, MapPin, Printer, Truck, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useOperationalCosts, useUpdateOperationalCost, getOperationalCostValue } from '@/hooks/useOperationalCosts';

interface CostParameter {
  parametro: string;
  label: string;
  icon: React.ElementType;
  unidade: string;
  description: string;
  category: 'operacional' | 'producao';
}

const costParameters: CostParameter[] = [
  // Custos Operacionais
  { parametro: 'hospedagem_diaria', label: 'Hospedagem Diária', icon: Hotel, unidade: 'R$/dia', description: 'Custo médio de hospedagem por técnico por dia', category: 'operacional' },
  { parametro: 'dias_servico_remoto', label: 'Dias p/ Serviço Remoto', icon: MapPin, unidade: 'dias', description: 'Dias padrão para serviços em locais distantes', category: 'operacional' },
  { parametro: 'alimentacao_diaria', label: 'Alimentação Diária', icon: Utensils, unidade: 'R$/dia', description: 'Vale-refeição por dia por pessoa', category: 'operacional' },
  { parametro: 'custo_por_km', label: 'Custo por Km', icon: Fuel, unidade: 'R$/km', description: 'Custo médio por km rodado', category: 'operacional' },
  { parametro: 'distancia_minima_hospedagem', label: 'Distância Mín. Hospedagem', icon: MapPin, unidade: 'km', description: 'Distância mínima para considerar hospedagem', category: 'operacional' },
  { parametro: 'quantidade_tecnicos', label: 'Técnicos por Serviço', icon: Users, unidade: 'pessoas', description: 'Quantidade padrão de técnicos por serviço', category: 'operacional' },
  { parametro: 'depreciacao_equipamentos', label: 'Depreciação Equipamentos', icon: Wrench, unidade: '%', description: 'Percentual de depreciação por serviço', category: 'operacional' },
  { parametro: 'seguros_licencas', label: 'Seguros e Licenças', icon: Wrench, unidade: '%', description: 'Percentual de seguros e licenças', category: 'operacional' },
  { parametro: 'margem_contingencia', label: 'Margem de Contingência', icon: Wrench, unidade: '%', description: 'Margem de segurança recomendada', category: 'operacional' },
  
  // Custos de Produção e Materiais
  { parametro: 'custo_m2_lona', label: 'Custo m² Lona', icon: Palette, unidade: 'R$/m²', description: 'Custo do material de lona por metro quadrado', category: 'producao' },
  { parametro: 'custo_impressao_base', label: 'Impressão - Base', icon: Printer, unidade: 'R$', description: 'Custo fixo de setup de impressão', category: 'producao' },
  { parametro: 'custo_impressao_m2', label: 'Impressão - Por m²', icon: Printer, unidade: 'R$/m²', description: 'Custo de impressão por metro quadrado', category: 'producao' },
  { parametro: 'custo_envio_base', label: 'Envio - Base', icon: Truck, unidade: 'R$', description: 'Custo fixo de envio/frete', category: 'producao' },
  { parametro: 'custo_envio_km', label: 'Envio - Por km', icon: Truck, unidade: 'R$/km', description: 'Custo de envio por quilômetro', category: 'producao' },
];

const operacionalParams = costParameters.filter(p => p.category === 'operacional');
const producaoParams = costParameters.filter(p => p.category === 'producao');

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

  const renderCostFields = (params: CostParameter[]) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {params.map((param) => {
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
  );

  return (
    <div className="space-y-6">
      {/* Custos Operacionais */}
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
          {renderCostFields(operacionalParams)}
        </CardContent>
      </Card>

      {/* Custos de Produção e Materiais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Produção e Materiais
          </CardTitle>
          <CardDescription>
            Configure os custos de lona, impressão e envio para cálculo de ordens de serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderCostFields(producaoParams)}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Todos os Custos
        </Button>
      </div>
    </div>
  );
}
