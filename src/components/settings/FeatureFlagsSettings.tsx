import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { showToast } from '@/lib/toast';

const MODULE_LABELS: Record<string, string> = {
  media: 'Mídia Externa',
  merchandising: 'Merchandising',
  financeiro: 'Financeiro',
  mapa: 'Mapa Estratégico',
  agencia: 'Agência',
  loteamentos: 'Loteamentos',
  analise: 'Análise Estratégica',
  configuracoes: 'Configurações',
};

export function FeatureFlagsSettings() {
  const { flags, isLoading, toggleFlag } = useFeatureFlags();

  const moduleFlags = flags.filter(f => f.feature_key === '__module__');
  const featureFlags = flags.filter(f => f.feature_key !== '__module__');

  const handleToggle = async (moduleKey: string, featureKey: string, currentEnabled: boolean) => {
    if (moduleKey === 'configuracoes' && featureKey === '__module__') {
      showToast.error('O módulo Configurações não pode ser desabilitado.');
      return;
    }

    try {
      await toggleFlag.mutateAsync({ moduleKey, featureKey, enabled: !currentEnabled });
      showToast.success(`${MODULE_LABELS[moduleKey] || moduleKey} ${!currentEnabled ? 'habilitado' : 'desabilitado'}`);
    } catch {
      showToast.error('Erro ao alterar configuração');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Módulos do Sistema
          </CardTitle>
          <CardDescription>
            Habilite ou desabilite módulos inteiros. Módulos desabilitados ficam inacessíveis para todos os usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {moduleFlags.map((flag) => {
            const isProtected = flag.module_key === 'configuracoes';
            return (
              <div key={flag.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Label className="font-medium">
                    {MODULE_LABELS[flag.module_key] || flag.module_key}
                  </Label>
                  {isProtected && (
                    <Badge variant="outline" className="text-xs">Essencial</Badge>
                  )}
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => handleToggle(flag.module_key, flag.feature_key, flag.enabled)}
                  disabled={isProtected || toggleFlag.isPending}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {featureFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Funções Específicas</CardTitle>
            <CardDescription>
              Habilite ou desabilite funções específicas dentro de cada módulo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {featureFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <Label className="font-medium">{flag.feature_key}</Label>
                  <p className="text-xs text-muted-foreground">{MODULE_LABELS[flag.module_key] || flag.module_key}</p>
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => handleToggle(flag.module_key, flag.feature_key, flag.enabled)}
                  disabled={toggleFlag.isPending}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
