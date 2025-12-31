import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Upload, Fuel, X, Plus, GripVertical, Images } from 'lucide-react';
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
  background_type: 'slider',
  background_color: '#2563eb',
  background_image: null,
  slider_images: [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200&auto=format&fit=crop&q=80',
  ],
  slider_interval: 5000,
  overlay_opacity: 40,
  title: 'Gestão & Marketing',
  subtitle: 'Sistema completo para gestão de merchandising e mídia externa',
};

export function LoginScreenSettings() {
  const { data: savedSettings, isLoading } = useSystemSetting<LoginSettings>('login_screen_settings', defaultSettings);
  const updateSetting = useUpdateSystemSetting();
  
  const [settings, setSettings] = useState<LoginSettings>(defaultSettings);
  const [isUploading, setIsUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        ...defaultSettings,
        ...savedSettings,
        slider_images: savedSettings.slider_images || defaultSettings.slider_images,
        slider_interval: savedSettings.slider_interval || defaultSettings.slider_interval,
      });
    }
  }, [savedSettings]);

  // Auto-rotate preview for slider
  useEffect(() => {
    if (settings.background_type !== 'slider' || settings.slider_images.length <= 1) return;
    
    const timer = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % settings.slider_images.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [settings.background_type, settings.slider_images.length]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSlider = false) => {
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

    if (isSlider && settings.slider_images.length >= 6) {
      toast.error('Máximo de 6 imagens no carrossel');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadPhoto(file, 'system');
      if (url) {
        if (isSlider) {
          setSettings(prev => ({ 
            ...prev, 
            slider_images: [...prev.slider_images, url] 
          }));
        } else {
          setSettings(prev => ({ ...prev, background_image: url }));
        }
        toast.success('Imagem carregada com sucesso!');
      } else {
        toast.error('Erro ao carregar imagem');
      }
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setIsUploading(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const removeImage = (index?: number) => {
    if (typeof index === 'number') {
      setSettings(prev => ({
        ...prev,
        slider_images: prev.slider_images.filter((_, i) => i !== index),
      }));
    } else {
      setSettings(prev => ({ ...prev, background_image: null }));
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= settings.slider_images.length) return;
    
    const newImages = [...settings.slider_images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setSettings(prev => ({ ...prev, slider_images: newImages }));
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
              onValueChange={(value: 'color' | 'image' | 'slider') => 
                setSettings(prev => ({ ...prev, background_type: value }))
              }
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="color" id="bg-color" />
                <Label htmlFor="bg-color" className="cursor-pointer">Cor sólida</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="bg-image" />
                <Label htmlFor="bg-image" className="cursor-pointer">Imagem única</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="slider" id="bg-slider" />
                <Label htmlFor="bg-slider" className="cursor-pointer flex items-center gap-1">
                  <Images className="h-4 w-4" />
                  Carrossel de Imagens
                </Label>
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

          {/* Single Image Upload */}
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
                    onClick={() => removeImage()}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleImageUpload(e, false)}
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

          {/* Slider Images */}
          {settings.background_type === 'slider' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Imagens do Carrossel ({settings.slider_images.length}/6)</Label>
                <span className="text-xs text-muted-foreground">Mínimo 2, máximo 6 imagens</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {settings.slider_images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveImage(index, index - 1)}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeImage(index)}
                        disabled={settings.slider_images.length <= 2}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index < settings.slider_images.length - 1 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveImage(index, index + 1)}
                        >
                          <GripVertical className="h-3 w-3 -rotate-90" />
                        </Button>
                      )}
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}

                {settings.slider_images.length < 6 && (
                  <div className="border-2 border-dashed rounded-lg h-24 flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="hidden"
                      id="slider-image-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="slider-image-upload"
                      className="cursor-pointer flex flex-col items-center gap-1 p-2"
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground text-center">Adicionar</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Intervalo de Transição: {settings.slider_interval / 1000}s</Label>
                <Slider
                  value={[settings.slider_interval]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, slider_interval: value }))}
                  min={3000}
                  max={10000}
                  step={1000}
                  className="w-full max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo entre cada transição de imagem
                </p>
              </div>

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
                  Camada escura sobre as imagens para melhor legibilidade do texto
                </p>
              </div>
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
              }}
            >
              {settings.background_type === 'image' && settings.background_image && (
                <img
                  src={settings.background_image}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              
              {settings.background_type === 'slider' && settings.slider_images.length > 0 && (
                <img
                  src={settings.slider_images[previewIndex]}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                />
              )}

              {(settings.background_type === 'image' || settings.background_type === 'slider') && (
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

              {/* Slider indicators in preview */}
              {settings.background_type === 'slider' && settings.slider_images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                  {settings.slider_images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 rounded-full transition-all ${
                        previewIndex === index ? 'w-3 bg-white' : 'w-1 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
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
