import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ChecklistSettingsManager } from '@/components/settings/ChecklistSettingsManager';
import { LoginScreenSettings } from '@/components/settings/LoginScreenSettings';
import { ToastStyleSettings } from '@/components/settings/ToastStyleSettings';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Upload, 
  Save, 
  Image,
  Moon,
  Sun,
  Check,
  Loader2,
  Bell,
  CalendarClock,
  History,
  Settings2,
  ClipboardCheck,
  LogIn,
  MessageSquare,
  LayoutGrid,
  DollarSign,
  RefreshCcw
} from 'lucide-react';
import { OperationalCostsSettings } from '@/components/settings/OperationalCostsSettings';
import { RegionalMultiplierSettings } from '@/components/settings/RegionalMultiplierSettings';
import { FieldOptionsSettings } from '@/components/settings/FieldOptionsSettings';
import { ModuleAppearanceSettings } from '@/components/settings/ModuleAppearanceSettings';
import { OutdoorCycleSettings } from '@/components/settings/OutdoorCycleSettings';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useSystemSettings, 
  useUpdateSystemSetting,
  EvaluationFrequency,
  NotificationSettings as NotificationSettingsType,
} from '@/hooks/useSystemSettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const colorPalettes = [
  { 
    name: 'Padrão (Azul)', 
    id: 'default',
    primary: 'hsl(220, 70%, 50%)',
    colors: { primary: '220 70% 50%', success: '142 76% 36%', warning: '38 92% 50%' }
  },
  { 
    name: 'Esmeralda', 
    id: 'emerald',
    primary: 'hsl(160, 84%, 39%)',
    colors: { primary: '160 84% 39%', success: '142 76% 36%', warning: '38 92% 50%' }
  },
  { 
    name: 'Violeta', 
    id: 'violet',
    primary: 'hsl(263, 70%, 50%)',
    colors: { primary: '263 70% 50%', success: '142 76% 36%', warning: '38 92% 50%' }
  },
  { 
    name: 'Vermelho', 
    id: 'red',
    primary: 'hsl(0, 72%, 51%)',
    colors: { primary: '0 72% 51%', success: '142 76% 36%', warning: '38 92% 50%' }
  },
  { 
    name: 'Laranja', 
    id: 'orange',
    primary: 'hsl(25, 95%, 53%)',
    colors: { primary: '25 95% 53%', success: '142 76% 36%', warning: '38 92% 50%' }
  },
  { 
    name: 'Rosa', 
    id: 'pink',
    primary: 'hsl(330, 81%, 60%)',
    colors: { primary: '330 81% 60%', success: '142 76% 36%', warning: '38 92% 50%' }
  },
];

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const { profile } = useAuth();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState('default');
  const [systemName, setSystemName] = useState('Gestão & Marketing');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';
  
  // System settings hooks
  const { data: systemSettings, isLoading: settingsLoading } = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();

  // Evaluation settings state
  const [evalFrequency, setEvalFrequency] = useState<EvaluationFrequency>({ pdv_days: 30, outdoor_days: 7 });
  const [notifSettings, setNotifSettings] = useState<NotificationSettingsType>({ 
    alert_managers: true, 
    days_before: 3, 
    enabled: true 
  });

  // Load system settings
  useEffect(() => {
    if (systemSettings) {
      const freqSetting = systemSettings.find(s => s.key === 'evaluation_frequency');
      const notifSetting = systemSettings.find(s => s.key === 'notification_settings');
      
      if (freqSetting?.value && typeof freqSetting.value === 'object') {
        setEvalFrequency(freqSetting.value as unknown as EvaluationFrequency);
      }
      if (notifSetting?.value && typeof notifSetting.value === 'object') {
        setNotifSettings(notifSetting.value as unknown as NotificationSettingsType);
      }
    }
  }, [systemSettings]);

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.systemName) setSystemName(settings.systemName);
      if (settings.logo) setLogoPreview(settings.logo);
      if (settings.palette) {
        setSelectedPalette(settings.palette);
        const palette = colorPalettes.find(p => p.id === settings.palette);
        if (palette) {
          document.documentElement.style.setProperty('--primary', palette.colors.primary);
        }
      }
    }
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Upload to Supabase Storage
      const fileName = `system/logo-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      setLogoPreview(urlData.publicUrl);
      showToast.success('Logo carregada com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      // Fallback to base64 for local storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        showToast.success('Logo carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    const palette = colorPalettes.find(p => p.id === paletteId);
    if (palette) {
      document.documentElement.style.setProperty('--primary', palette.colors.primary);
      showToast.success(`Paleta "${palette.name}" aplicada!`);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    showToast.success(`Tema ${newTheme === 'light' ? 'claro' : 'escuro'} ativado!`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const settings = {
      systemName,
      logo: logoPreview,
      palette: selectedPalette,
      theme,
    };
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('systemSettingsUpdated', { detail: settings }));
    
    setIsSaving(false);
    showToast.success('Configurações salvas com sucesso!');
  };

  const handleSaveEvaluationSettings = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'evaluation_frequency', value: evalFrequency as unknown as Record<string, number> });
      await updateSetting.mutateAsync({ key: 'notification_settings', value: notifSettings as unknown as Record<string, boolean | number> });
    } catch (error) {
      console.error('Error saving evaluation settings:', error);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <SettingsIcon className="h-8 w-8" />
              Configurações
            </h1>
            <p className="text-muted-foreground mt-1">Personalize o sistema de acordo com sua marca</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className={cn("grid w-full max-w-5xl", isSuperAdmin ? "grid-cols-11" : "grid-cols-3")}>
            <TabsTrigger value="branding">
              <Image className="h-4 w-4 mr-2" />
              Marca
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="login-screen">
                <LogIn className="h-4 w-4 mr-2" />
                Tela Inicial
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="modules">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Módulos
              </TabsTrigger>
            )}
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="toast-style">
                <MessageSquare className="h-4 w-4 mr-2" />
                Toast
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="checklist">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Checklist
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="evaluations">
                <CalendarClock className="h-4 w-4 mr-2" />
                Avaliações
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="cycle">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Ciclo
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="fields">
                <Settings2 className="h-4 w-4 mr-2" />
                Campos
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="costs">
                <DollarSign className="h-4 w-4 mr-2" />
                Custos
              </TabsTrigger>
            )}
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>Configure a logomarca e nome do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* System Name */}
                <div className="space-y-2">
                  <Label htmlFor="systemName">Nome do Sistema</Label>
                  <Input
                    id="systemName"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    placeholder="Nome do sistema"
                  />
                </div>

                {/* Logo Upload */}
                <div className="space-y-4">
                  <Label>Logomarca</Label>
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Preview */}
                    <div className="w-40 h-40 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Image className="h-10 w-10 mx-auto mb-2" />
                          <p className="text-xs">Prévia da logo</p>
                        </div>
                      )}
                    </div>

                    {/* Upload Area */}
                    <div className="flex-1 space-y-3">
                      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          id="logo-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                        />
                        <label htmlFor="logo-upload" className="cursor-pointer">
                          {isUploadingLogo ? (
                            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
                          ) : (
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          )}
                          <p className="text-sm font-medium">
                            {isUploadingLogo ? 'Enviando...' : 'Clique para enviar'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG ou SVG (máx. 5MB)
                          </p>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recomendado: Logo quadrada ou horizontal, fundo transparente, mínimo 200x200px
                      </p>
                      {logoPreview && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLogoPreview(null)}
                        >
                          Remover Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login Screen Tab (Super Admin only) */}
          {isSuperAdmin && (
            <TabsContent value="login-screen" className="space-y-6">
              <LoginScreenSettings />
            </TabsContent>
          )}

          {/* Module Appearance Tab (Super Admin only) */}
          {isSuperAdmin && (
            <TabsContent value="modules" className="space-y-6">
              <ModuleAppearanceSettings />
            </TabsContent>
          )}

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paleta de Cores</CardTitle>
                <CardDescription>Escolha uma paleta de cores para personalizar o sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {colorPalettes.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => handlePaletteSelect(palette.id)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all text-left",
                        selectedPalette === palette.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {selectedPalette === palette.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div 
                        className="w-12 h-12 rounded-lg mb-3"
                        style={{ backgroundColor: palette.primary }}
                      />
                      <p className="font-medium">{palette.name}</p>
                      <div className="flex gap-1 mt-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `hsl(${palette.colors.primary})` }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `hsl(${palette.colors.success})` }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: `hsl(${palette.colors.warning})` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
                <CardDescription>Escolha entre modo claro ou escuro</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      "relative flex-1 p-4 rounded-xl border-2 transition-all",
                      theme === 'light' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {theme === 'light' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <Sun className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <p className="text-sm font-medium text-center">Claro</p>
                  </button>
                  <button 
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      "relative flex-1 p-4 rounded-xl border-2 transition-all",
                      theme === 'dark' 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {theme === 'dark' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <Moon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-center">Escuro</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          {/* Toast Style Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="toast-style" className="space-y-6">
              <ToastStyleSettings />
            </TabsContent>
          )}

          {/* Checklist Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="checklist" className="space-y-6">
              <ChecklistSettingsManager />
            </TabsContent>
          )}

          {/* Evaluations Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="evaluations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Periodicidade de Avaliações
                  </CardTitle>
                  <CardDescription>
                    Configure a frequência com que PDVs e Outdoors devem ser avaliados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {settingsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* PDV Evaluation Frequency */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Avaliação de PDVs (Merchandising)</Label>
                            <p className="text-sm text-muted-foreground">
                              Frequência para avaliação completa dos pontos de venda
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-primary">
                            {evalFrequency.pdv_days} dias
                          </span>
                        </div>
                        <Slider
                          value={[evalFrequency.pdv_days]}
                          onValueChange={([value]) => setEvalFrequency(prev => ({ ...prev, pdv_days: value }))}
                          min={7}
                          max={90}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>7 dias</span>
                          <span>30 dias</span>
                          <span>60 dias</span>
                          <span>90 dias</span>
                        </div>
                      </div>

                      {/* Outdoor Status Frequency */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Status de Outdoors (Mídia Externa)</Label>
                            <p className="text-sm text-muted-foreground">
                              Frequência para verificação do status dos outdoors
                            </p>
                          </div>
                          <span className="text-2xl font-bold text-primary">
                            {evalFrequency.outdoor_days} dias
                          </span>
                        </div>
                        <Slider
                          value={[evalFrequency.outdoor_days]}
                          onValueChange={([value]) => setEvalFrequency(prev => ({ ...prev, outdoor_days: value }))}
                          min={1}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Diário</span>
                          <span>Semanal</span>
                          <span>Quinzenal</span>
                          <span>Mensal</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações de Avaliação
                  </CardTitle>
                  <CardDescription>
                    Configure alertas automáticos para gerentes sobre avaliações pendentes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações Ativas</Label>
                      <p className="text-sm text-muted-foreground">
                        Ativar envio automático de notificações
                      </p>
                    </div>
                    <Switch
                      checked={notifSettings.enabled}
                      onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Alertar Gerentes</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações para gerentes dos PDVs
                      </p>
                    </div>
                    <Switch
                      checked={notifSettings.alert_managers}
                      onCheckedChange={(checked) => setNotifSettings(prev => ({ ...prev, alert_managers: checked }))}
                      disabled={!notifSettings.enabled}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Dias de Antecedência</Label>
                        <p className="text-sm text-muted-foreground">
                          Quantos dias antes do vencimento enviar o alerta
                        </p>
                      </div>
                      <span className="text-xl font-bold text-primary">
                        {notifSettings.days_before} dias
                      </span>
                    </div>
                    <Slider
                      value={[notifSettings.days_before]}
                      onValueChange={([value]) => setNotifSettings(prev => ({ ...prev, days_before: value }))}
                      min={1}
                      max={14}
                      step={1}
                      disabled={!notifSettings.enabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Settings History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Alterações
                  </CardTitle>
                  <CardDescription>
                    Últimas modificações nas configurações de avaliação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {systemSettings && systemSettings.length > 0 ? (
                    <div className="space-y-3">
                      {systemSettings.map((setting) => (
                        <div key={setting.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium text-sm">
                              {setting.key === 'evaluation_frequency' && 'Frequência de Avaliações'}
                              {setting.key === 'notification_settings' && 'Configurações de Notificação'}
                              {setting.key === 'evaluation_config' && 'Configuração Geral'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {setting.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Atualizado em
                            </p>
                            <p className="text-sm">
                              {format(new Date(setting.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma alteração registrada
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveEvaluationSettings}
                  disabled={updateSetting.isPending}
                >
                  {updateSetting.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações de Avaliação
                </Button>
              </div>
            </TabsContent>
          )}

          {/* Cycle Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="cycle" className="space-y-6">
              <OutdoorCycleSettings />
            </TabsContent>
          )}

          {/* Fields Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="fields" className="space-y-6">
              <FieldOptionsSettings />
            </TabsContent>
          )}

          {/* Costs Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="costs" className="space-y-6">
              <OperationalCostsSettings />
              <RegionalMultiplierSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
}

export default function Settings() {
  return (
    <AppLayout>
      <SettingsContent />
    </AppLayout>
  );
}