import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, UserCog, Lock, Info } from 'lucide-react';
import {
  useDirectorMenuPermissions,
  useUpdateDirectorMenuPermissions,
  DirectorMenuPermissions,
  directorDefaultPermissions,
  directorMandatoryItems,
} from '@/hooks/useDirectorMenuPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MenuItemConfig {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

const directorMediaMenuItems: MenuItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Painel com KPIs estratégicos' },
  { key: 'outdoors', label: 'Outdoors', description: 'Visualizar lista de outdoors' },
  { key: 'aprovar_manutencao', label: 'Aprovar Manutenção', required: true, description: 'Revisão de pacotes de manutenção' },
  { key: 'relatorios', label: 'Relatórios', description: 'Relatórios executivos' },
  { key: 'observacoes_enviadas', label: 'Observações Enviadas', required: true, description: 'Histórico de observações pessoais' },
];

const redirectOptions = [
  { value: '/media/dashboard', label: 'Dashboard' },
  { value: '/outdoors', label: 'Outdoors' },
  { value: '/maintenance-approval', label: 'Aprovar Manutenção' },
  { value: '/reports', label: 'Relatórios' },
  { value: '/director-observations', label: 'Observações Enviadas' },
];

export function DirectorMenuSettings() {
  const { data: permissions, isLoading } = useDirectorMenuPermissions();
  const updatePermissions = useUpdateDirectorMenuPermissions();

  const [localPermissions, setLocalPermissions] = useState<DirectorMenuPermissions>(directorDefaultPermissions);

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handleToggleItem = (key: string, enabled: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      media: {
        ...prev.media,
        [key]: enabled,
      },
    }));
  };

  const handleRedirectChange = (value: string) => {
    setLocalPermissions(prev => ({
      ...prev,
      default_redirect: {
        ...prev.default_redirect,
        media: value,
      },
    }));
  };

  const handleSave = async () => {
    await updatePermissions.mutateAsync(localPermissions);
  };

  const currentRedirect = localPermissions.default_redirect.media;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Permissões de Menu para Diretores (Mídia Externa)
          </CardTitle>
          <CardDescription>
            Configure quais itens do menu os diretores podem ver no módulo Mídia Externa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Redirect */}
          <div className="space-y-2">
            <Label>Página Inicial (Redirecionamento)</Label>
            <p className="text-sm text-muted-foreground">
              Para onde o diretor será redirecionado ao acessar o módulo Mídia Externa
            </p>
            <Select value={currentRedirect} onValueChange={handleRedirectChange}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {redirectOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu Items */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-base">Itens do Menu</Label>
              <Badge variant="outline" className="text-xs">Mídia Externa</Badge>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Itens obrigatórios (Aprovar Manutenção e Observações Enviadas) não podem ser desativados.
              </AlertDescription>
            </Alert>

            <div className="divide-y divide-border rounded-lg border">
              {directorMediaMenuItems.map((item) => {
                const isEnabled = (localPermissions.media as Record<string, boolean>)[item.key] ?? true;
                const isRequired = item.required;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {isRequired && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleItem(item.key, checked)}
                      disabled={isRequired}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={updatePermissions.isPending}>
              {updatePermissions.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
