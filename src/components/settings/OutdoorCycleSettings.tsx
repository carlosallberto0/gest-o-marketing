import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  useOutdoorCycleConfig, 
  useUpdateOutdoorCycleConfig,
  OutdoorCycleConfig 
} from '@/hooks/useOutdoorCycleConfig';
import { 
  Clock, 
  Bell, 
  AlertTriangle, 
  Save,
  Loader2,
  RotateCcw,
  Settings2
} from 'lucide-react';
import { showToast } from '@/lib/toast';

const DEFAULT_CONFIG: OutdoorCycleConfig = {
  validade_horas: 24,
  comportamento_expiracao: 'pendente_reavaliacao',
  notificar_gerente_horas_antes: 6,
  notificar_super_admin_expirado_24h: true,
  bloquear_pagamento_nao_operacional: true,
};

export function OutdoorCycleSettings() {
  const { data: currentConfig, isLoading } = useOutdoorCycleConfig();
  const updateConfig = useUpdateOutdoorCycleConfig();
  
  const [localConfig, setLocalConfig] = useState<OutdoorCycleConfig>(DEFAULT_CONFIG);
  const [customHours, setCustomHours] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('24');

  useEffect(() => {
    if (currentConfig) {
      setLocalConfig(currentConfig);
      const hours = currentConfig.validade_horas.toString();
      if (['12', '24', '48'].includes(hours)) {
        setSelectedPreset(hours);
        setCustomHours('');
      } else {
        setSelectedPreset('custom');
        setCustomHours(hours);
      }
    }
  }, [currentConfig]);

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value !== 'custom') {
      setLocalConfig(prev => ({ ...prev, validade_horas: parseInt(value) }));
      setCustomHours('');
    }
  };

  const handleCustomHoursChange = (value: string) => {
    setCustomHours(value);
    const hours = parseInt(value);
    if (!isNaN(hours) && hours > 0) {
      setLocalConfig(prev => ({ ...prev, validade_horas: hours }));
    }
  };

  const handleSave = async () => {
    await updateConfig.mutateAsync(localConfig);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
    setSelectedPreset('24');
    setCustomHours('');
    showToast.info('Configurações restauradas para o padrão');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tempo de Validade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo de Validade da Avaliação
          </CardTitle>
          <CardDescription>
            Define por quanto tempo uma avaliação é considerada válida antes de expirar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedPreset} onValueChange={handlePresetChange}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="12" id="hours-12" />
                <Label htmlFor="hours-12" className="cursor-pointer">12 horas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="24" id="hours-24" />
                <Label htmlFor="hours-24" className="cursor-pointer">24 horas (padrão)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="48" id="hours-48" />
                <Label htmlFor="hours-48" className="cursor-pointer">48 horas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="hours-custom" />
                <Label htmlFor="hours-custom" className="cursor-pointer">Personalizado</Label>
              </div>
            </div>
          </RadioGroup>
          
          {selectedPreset === 'custom' && (
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                min="1"
                max="720"
                value={customHours}
                onChange={(e) => handleCustomHoursChange(e.target.value)}
                className="w-24"
                placeholder="Horas"
              />
              <span className="text-muted-foreground">horas</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comportamento após Expiração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Comportamento Após Expiração
          </CardTitle>
          <CardDescription>
            O que acontece quando a avaliação expira?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup 
            value={localConfig.comportamento_expiracao} 
            onValueChange={(v) => setLocalConfig(prev => ({ 
              ...prev, 
              comportamento_expiracao: v as 'pendente_reavaliacao' | 'bloquear_pagamento' 
            }))}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="pendente_reavaliacao" id="exp-pending" className="mt-1" />
                <div>
                  <Label htmlFor="exp-pending" className="cursor-pointer font-medium">
                    Muda status para "Pendente de Reavaliação"
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Apenas alerta visual. O outdoor continua operacional mas requer nova verificação.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="bloquear_pagamento" id="exp-block" className="mt-1" />
                <div>
                  <Label htmlFor="exp-block" className="cursor-pointer font-medium">
                    Bloquear pagamento automaticamente
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Impede aprovação de contratos até nova avaliação ser realizada.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Alertas e Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas e Notificações
          </CardTitle>
          <CardDescription>
            Configure quando e para quem enviar notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <Label className="font-medium">Notificar gerente antes de expirar</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Envia alerta ao gerente responsável quando a avaliação estiver prestes a expirar
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="48"
                value={localConfig.notificar_gerente_horas_antes}
                onChange={(e) => setLocalConfig(prev => ({ 
                  ...prev, 
                  notificar_gerente_horas_antes: parseInt(e.target.value) || 6 
                }))}
                className="w-16 text-center"
              />
              <span className="text-sm text-muted-foreground">horas antes</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <Label className="font-medium">Notificar Super Admin sobre atrasos</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Envia alerta ao Super Admin quando outdoors estão com avaliação expirada há mais de 24h
              </p>
            </div>
            <Switch
              checked={localConfig.notificar_super_admin_expirado_24h}
              onCheckedChange={(checked) => setLocalConfig(prev => ({ 
                ...prev, 
                notificar_super_admin_expirado_24h: checked 
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Controle Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Controle Financeiro
          </CardTitle>
          <CardDescription>
            Configurações de bloqueio de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <Label className="font-medium">Bloquear pagamento quando "Não Operacional"</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Outdoors marcados como não operacionais automaticamente bloqueiam pagamentos relacionados
              </p>
            </div>
            <Switch
              checked={localConfig.bloquear_pagamento_nao_operacional}
              onCheckedChange={(checked) => setLocalConfig(prev => ({ 
                ...prev, 
                bloquear_pagamento_nao_operacional: checked 
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrões
        </Button>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          {updateConfig.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
