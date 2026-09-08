import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save, Bell, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemSetting, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
import { AlertToast } from '@/components/ui/alert-toast';
import { ToastSettings, ToastStyleVariant, ToastPosition } from '@/contexts/AlertToastContext';

const defaultSettings: ToastSettings = {
  style_variant: 'filled',
  position: 'top-right',
  duration: 5000,
  max_toasts: 3,
  show_close_button: true,
  enable_animations: true,
};

const positions: { id: ToastPosition; label: string }[] = [
  { id: 'top-left', label: 'Superior Esquerda' },
  { id: 'top-right', label: 'Superior Direita' },
  { id: 'top-center', label: 'Superior Centro' },
  { id: 'bottom-left', label: 'Inferior Esquerda' },
  { id: 'bottom-right', label: 'Inferior Direita' },
  { id: 'bottom-center', label: 'Inferior Centro' },
];

export function ToastStyleSettings() {
  const { data: savedSettings, isLoading } = useSystemSetting<ToastSettings>('toast_style_settings', defaultSettings);
  const updateSetting = useUpdateSystemSetting();
  
  const [settings, setSettings] = useState<ToastSettings>(defaultSettings);
  const [previewVariant, setPreviewVariant] = useState<'success' | 'warning' | 'info' | 'error'>('success');

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const handleSave = async () => {
    await updateSetting.mutateAsync({
      key: 'toast_style_settings',
      value: settings as unknown as Record<string, unknown>,
    });
  };

  const cyclePreview = () => {
    const variants: Array<'success' | 'warning' | 'info' | 'error'> = ['success', 'warning', 'info', 'error'];
    const currentIndex = variants.indexOf(previewVariant);
    setPreviewVariant(variants[(currentIndex + 1) % variants.length]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const previewMessages = {
    success: { title: 'Operação concluída', description: 'Os dados foram salvos com sucesso!' },
    warning: { title: 'Atenção necessária', description: 'Verifique os campos destacados.' },
    info: { title: 'Nova atualização', description: 'Versão 2.1.0 disponível para instalação.' },
    error: { title: 'Erro ao processar', description: 'Por favor, tente novamente mais tarde.' },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Estilo das Notificações Toast
          </CardTitle>
          <CardDescription>
            Configure a aparência das notificações que aparecem no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Style Variant */}
          <div className="space-y-4">
            <Label className="text-base">Estilo Visual</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSettings(prev => ({ ...prev, style_variant: 'filled' }))}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  settings.style_variant === 'filled'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-success mb-2" />
                <p className="font-medium">Preenchido</p>
                <p className="text-xs text-muted-foreground">Cores sólidas de fundo</p>
              </button>
              <button
                onClick={() => setSettings(prev => ({ ...prev, style_variant: 'default' }))}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  settings.style_variant === 'default'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-8 h-8 rounded-lg border-2 border-success bg-background mb-2" />
                <p className="font-medium">Contornado</p>
                <p className="text-xs text-muted-foreground">Fundo claro com bordas coloridas</p>
              </button>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-4">
            <Label className="text-base">Posição na Tela</Label>
            <div className="grid grid-cols-3 gap-2">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setSettings(prev => ({ ...prev, position: pos.id }))}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-sm",
                    settings.position === pos.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Duração</Label>
                <p className="text-sm text-muted-foreground">
                  Tempo que a notificação permanece visível
                </p>
              </div>
              <span className="text-xl font-bold text-primary">
                {(settings.duration / 1000).toFixed(1)}s
              </span>
            </div>
            <Slider
              value={[settings.duration]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, duration: value }))}
              min={2000}
              max={10000}
              step={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2s</span>
              <span>5s</span>
              <span>10s</span>
            </div>
          </div>

          {/* Max Toasts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Quantidade Máxima</Label>
                <p className="text-sm text-muted-foreground">
                  Notificações visíveis simultaneamente
                </p>
              </div>
              <span className="text-xl font-bold text-primary">
                {settings.max_toasts}
              </span>
            </div>
            <Slider
              value={[settings.max_toasts]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, max_toasts: value }))}
              min={1}
              max={5}
              step={1}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Botão de Fechar</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir X para fechar a notificação
                </p>
              </div>
              <Switch
                checked={settings.show_close_button}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_close_button: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Animações</Label>
                <p className="text-sm text-muted-foreground">
                  Habilitar animações de entrada e saída
                </p>
              </div>
              <Switch
                checked={settings.enable_animations}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enable_animations: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Prévia
          </CardTitle>
          <CardDescription>
            Veja como as notificações aparecerão com as configurações atuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-sm">
              <AlertToast
                variant={previewVariant}
                styleVariant={settings.style_variant}
                title={previewMessages[previewVariant].title}
                description={previewMessages[previewVariant].description}
                onClose={() => {}}
                showCloseButton={settings.show_close_button}
                enableAnimations={false}
              />
            </div>
            <Button variant="outline" size="sm" onClick={cyclePreview}>
              Alternar Tipo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSetting.isPending}>
          {updateSetting.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
