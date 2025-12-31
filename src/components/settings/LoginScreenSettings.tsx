import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Upload, Fuel, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateSystemSetting, useSystemSetting } from '@/hooks/useSystemSettings';
import { uploadPhoto } from '@/lib/storage';
import { LoginScreenSettings as LoginSettings } from '@/hooks/useLoginScreenSettings';

const colorPalettes = [
  { name: 'Azul', color: '#2563eb' },
  { name: 'Verde', color: '#10b981' },
  { name: 'Roxo', color: '#7c3aed' },
  { name: 'Vermelho', color: '#ef4444' },
  { name: 'Laranja', color: '#f97316' },
  { name: 'Rosa', color: '#ec4899' },
  { name: 'Cinza', color: '#374151' },
];

const defaultSettings: LoginSettings = {
  background_type: 'color',
  background_color: '#2563eb',
  background_image: null,
  overlay_opacity: 50,
  title: 'Gestão & Marketing',
  subtitle: 'Sistema completo para gestão de merchandising e mídia externa',
};

export function LoginScreenSettings() {
  const { data: savedSettings, isLoading } = useSystemSetting<LoginSettings>('login_screen_settings', defaultSettings);
  const updateSetting = useUpdateSystemSetting();
  
  const [settings, setSettings] = useState<LoginSettings>(defaultSettings);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'login_screen_settings',
        value: settings as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PNG, JPG ou WEBP');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadPhoto(file, 'system');
      if (url) {
        setSettings(prev => ({ ...prev, background_image: url }));
        toast.success('Imagem carregada com sucesso!');
      } else {
        toast.error('Erro ao carregar imagem');
      }
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setSettings(prev => ({ ...prev, background_image: null }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Tela de Login</CardTitle>
          <CardDescription>
            Personalize a aparência da tela inicial do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Type */}
          <div className="space-y-3">
            <Label>Tipo de Fundo</Label>
            <RadioGroup
              value={settings.background_type}
              onValueChange={(value: 'color' | 'image') => 
                setSettings(prev => ({ ...prev, background_type: value }))
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="color" id="bg-color" />
                <Label htmlFor="bg-color" className="cursor-pointer">Cor sólida</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="bg-image" />
                <Label htmlFor="bg-image" className="cursor-pointer">Imagem</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Color Selection */}
          {settings.background_type === 'color' && (
            <div className="space-y-3">
              <Label>Cor de Fundo</Label>
              <div className="flex flex-wrap gap-3">
                {colorPalettes.map(palette => (
                  <button
                    key={palette.color}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, background_color: palette.color }))}
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      settings.background_color === palette.color 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: palette.color }}
                    title={palette.name}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={settings.background_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, background_color: e.target.value }))}
                    className="w-12 h-12 p-1 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">Cor personalizada</span>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload */}
          {settings.background_type === 'image' && (
            <div className="space-y-4">
              <Label>Imagem de Fundo</Label>
              
              {settings.background_image ? (
                <div className="relative inline-block">
                  <img
                    src={settings.background_image}
                    alt="Background preview"
                    className="w-48 h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="bg-image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="bg-image-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      Clique para enviar uma imagem
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG ou WEBP (máx. 5MB)
                    </span>
                  </label>
                </div>
              )}

              {settings.background_image && (
                <div className="space-y-2">
                  <Label>Opacidade do Overlay: {settings.overlay_opacity}%</Label>
                  <Slider
                    value={[settings.overlay_opacity]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, overlay_opacity: value }))}
                    min={0}
                    max={80}
                    step={5}
                    className="w-full max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Camada escura sobre a imagem para melhor legibilidade do texto
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Texts */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-title">Título</Label>
              <Input
                id="login-title"
                value={settings.title}
                onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da tela de login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-subtitle">Subtítulo</Label>
              <Textarea
                id="login-subtitle"
                value={settings.subtitle}
                onChange={(e) => setSettings(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Descrição da tela de login"
                rows={2}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label>Prévia</Label>
            <div 
              className="relative w-64 h-40 rounded-lg overflow-hidden border"
              style={{
                backgroundColor: settings.background_type === 'color' ? settings.background_color : undefined,
                backgroundImage: settings.background_type === 'image' && settings.background_image 
                  ? `url(${settings.background_image})` 
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {settings.background_type === 'image' && settings.background_image && (
                <div 
                  className="absolute inset-0 bg-black"
                  style={{ opacity: settings.overlay_opacity / 100 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-4">
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center mb-2">
                  <Fuel className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-center line-clamp-1">{settings.title}</p>
                <p className="text-xs text-white/80 text-center line-clamp-2 mt-1">{settings.subtitle}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={updateSetting.isPending}
            className="mt-4"
          >
            {updateSetting.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
