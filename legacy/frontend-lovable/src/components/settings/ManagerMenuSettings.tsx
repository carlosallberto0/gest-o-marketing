import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Users, Lock, Info } from 'lucide-react';
import { 
  useManagerMenuPermissions, 
  useUpdateManagerMenuPermissions,
  ManagerMenuPermissions,
  defaultPermissions 
} from '@/hooks/useManagerMenuPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MenuItemConfig {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

const mediaMenuItems: MenuItemConfig[] = [
  { key: 'avaliar_outdoor', label: 'Avaliar Outdoor', required: true, description: 'Avaliação mensal de outdoors' },
  { key: 'solicitacoes_manutencao', label: 'Solicitações de Manutenção', description: 'Ver e criar solicitações' },
  { key: 'solicitar_materiais', label: 'Solicitar Materiais', description: 'Solicitar materiais para o PDV' },
];

const merchandisingMenuItems: MenuItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Painel com estatísticas' },
  { key: 'avaliacao_pdv', label: 'Avaliação de PDV', required: true, description: 'Checklist de avaliação' },
  { key: 'historico', label: 'Histórico de Avaliações', description: 'Ver avaliações anteriores' },
  { key: 'solicitar_materiais', label: 'Solicitar Materiais', description: 'Solicitar materiais para o PDV' },
];

const redirectOptions = {
  media: [
    { value: '/outdoor-evaluation', label: 'Avaliar Outdoor' },
    { value: '/maintenance-requests', label: 'Solicitações de Manutenção' },
    { value: '/material-requests', label: 'Solicitar Materiais' },
  ],
  merchandising: [
    { value: '/merchandising/dashboard', label: 'Dashboard' },
    { value: '/checklist', label: 'Avaliação de PDV' },
    { value: '/history', label: 'Histórico de Avaliações' },
    { value: '/material-requests', label: 'Solicitar Materiais' },
  ],
};

export function ManagerMenuSettings() {
  const { data: permissions, isLoading } = useManagerMenuPermissions();
  const updatePermissions = useUpdateManagerMenuPermissions();
  
  const [selectedModule, setSelectedModule] = useState<'media' | 'merchandising'>('media');
  const [localPermissions, setLocalPermissions] = useState<ManagerMenuPermissions>(defaultPermissions);

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(permissions);
    }
  }, [permissions]);

  const handleToggleItem = (key: string, enabled: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [selectedModule]: {
        ...prev[selectedModule],
        [key]: enabled,
      },
    }));
  };

  const handleRedirectChange = (value: string) => {
    setLocalPermissions(prev => ({
      ...prev,
      default_redirect: {
        ...prev.default_redirect,
        [selectedModule]: value,
      },
    }));
  };

  const handleSave = async () => {
    await updatePermissions.mutateAsync(localPermissions);
  };

  const currentMenuItems = selectedModule === 'media' ? mediaMenuItems : merchandisingMenuItems;
  const currentModulePermissions = localPermissions[selectedModule] as Record<string, boolean>;
  const currentRedirect = localPermissions.default_redirect[selectedModule];

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
            <Users className="h-5 w-5" />
            Permissões de Menu para Gerentes
          </CardTitle>
          <CardDescription>
            Configure quais itens do menu os gerentes podem ver e acessar em cada módulo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Module Selector */}
          <div className="space-y-2">
            <Label>Módulo</Label>
            <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v as 'media' | 'merchandising')}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="media">Mídia Externa</SelectItem>
                <SelectItem value="merchandising">Merchandising</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Default Redirect */}
          <div className="space-y-2">
            <Label>Página Inicial (Redirecionamento)</Label>
            <p className="text-sm text-muted-foreground">
              Para onde o gerente será redirecionado ao acessar este módulo
            </p>
            <Select value={currentRedirect} onValueChange={handleRedirectChange}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {redirectOptions[selectedModule].map(opt => (
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
              <Badge variant="outline" className="text-xs">
                {selectedModule === 'media' ? 'Mídia Externa' : 'Merchandising'}
              </Badge>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Itens obrigatórios não podem ser desativados. Eles são essenciais para o trabalho do gerente.
              </AlertDescription>
            </Alert>

            <div className="divide-y divide-border rounded-lg border">
              {currentMenuItems.map((item) => {
                const isEnabled = currentModulePermissions[item.key] ?? true;
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Visibilidade do Menu:</strong> Os itens desativados não aparecerão no menu lateral para usuários com perfil "Gerente".
          </p>
          <p>
            <strong>Redirecionamento:</strong> Ao acessar o módulo, o gerente será automaticamente direcionado para a página configurada.
          </p>
          <p>
            <strong>Segurança:</strong> Mesmo que um gerente tente acessar uma rota diretamente, as permissões de rota continuam sendo verificadas pelo sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
