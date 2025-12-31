import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LinkCard } from '@/components/ui/link-card';
import { ClipboardCheck, Megaphone, Map, Upload, X, Plus, Loader2, RotateCcw, Save } from 'lucide-react';
import { useModuleSettings, useUpdateModuleSettings, defaultModuleSettings, type ModuleAppearance, type ModuleAppearanceSettings as ModuleSettingsType } from '@/hooks/useModuleSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const moduleIcons = {
  merchandising: ClipboardCheck,
  media: Megaphone,
  mapa: Map,
};

const moduleLabels = {
  merchandising: 'Merchandising',
  media: 'Mídia Externa',
  mapa: 'Mapa Estratégico',
};

type ModuleKey = keyof ModuleSettingsType;

export function ModuleAppearanceSettings() {
  const { data: settings, isLoading } = useModuleSettings();
  const updateSettings = useUpdateModuleSettings();
  
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('merchandising');
  const [localSettings, setLocalSettings] = useState<ModuleSettingsType | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (isLoading || !localSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentModule = localSettings[selectedModule];
  const Icon = moduleIcons[selectedModule];

  const updateModuleField = <K extends keyof ModuleAppearance>(field: K, value: ModuleAppearance[K]) => {
    setLocalSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [selectedModule]: {
          ...prev[selectedModule],
          [field]: value,
        },
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileName = `modules/${selectedModule}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      updateModuleField('image_url', urlData.publicUrl);
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    updateModuleField('image_url', null);
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    const currentFeatures = currentModule.features || [];
    if (currentFeatures.length >= 10) {
      toast.error('Máximo de 10 funcionalidades');
      return;
    }
    updateModuleField('features', [...currentFeatures, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    const currentFeatures = currentModule.features || [];
    updateModuleField('features', currentFeatures.filter((_, i) => i !== index));
  };

  const handleResetToDefault = () => {
    setLocalSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [selectedModule]: defaultModuleSettings[selectedModule],
      };
    });
    toast.success('Configurações restauradas para o padrão');
  };

  const handleSave = () => {
    if (localSettings) {
      updateSettings.mutate(localSettings);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aparência dos Módulos</CardTitle>
          <CardDescription>
            Configure a aparência dos cards na tela de seleção de módulos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Module Selector */}
          <div className="space-y-2">
            <Label>Módulo</Label>
            <Select value={selectedModule} onValueChange={(v) => setSelectedModule(v as ModuleKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merchandising">Merchandising</SelectItem>
                <SelectItem value="media">Mídia Externa</SelectItem>
                <SelectItem value="mapa">Mapa Estratégico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Configuration Form */}
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={currentModule.title}
                  onChange={(e) => updateModuleField('title', e.target.value)}
                  placeholder="Título do módulo"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={currentModule.description}
                  onChange={(e) => updateModuleField('description', e.target.value)}
                  placeholder="Descrição do módulo"
                  rows={3}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagem de Fundo (opcional)</Label>
                <div className="flex gap-2">
                  {currentModule.image_url ? (
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden border">
                      <img
                        src={currentModule.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex-1">
                    <input
                      type="file"
                      id={`image-upload-${selectedModule}`}
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                    />
                    <label htmlFor={`image-upload-${selectedModule}`}>
                      <Button variant="outline" className="w-full" asChild disabled={isUploadingImage}>
                        <span>
                          {isUploadingImage ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {currentModule.image_url ? 'Alterar Imagem' : 'Carregar Imagem'}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou WEBP. Máximo 5MB. Se não houver imagem, o ícone será exibido.
                </p>
              </div>

              {/* Icon Color */}
              <div className="space-y-2">
                <Label htmlFor="icon-color">Cor do Ícone</Label>
                <div className="flex gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border flex-shrink-0"
                    style={{ backgroundColor: currentModule.icon_color }}
                  />
                  <Input
                    id="icon-color"
                    type="color"
                    value={currentModule.icon_color}
                    onChange={(e) => updateModuleField('icon_color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={currentModule.icon_color}
                    onChange={(e) => updateModuleField('icon_color', e.target.value)}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Button Color */}
              <div className="space-y-2">
                <Label htmlFor="button-color">Cor do Botão</Label>
                <div className="flex gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border flex-shrink-0"
                    style={{ backgroundColor: currentModule.button_color }}
                  />
                  <Input
                    id="button-color"
                    type="color"
                    value={currentModule.button_color}
                    onChange={(e) => updateModuleField('button_color', e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={currentModule.button_color}
                    onChange={(e) => updateModuleField('button_color', e.target.value)}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label>Funcionalidades</Label>
                <div className="space-y-2">
                  {(currentModule.features || []).map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...(currentModule.features || [])];
                          newFeatures[index] = e.target.value;
                          updateModuleField('features', newFeatures);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Nova funcionalidade"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button variant="outline" size="icon" onClick={handleAddFeature}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="bg-muted/30 rounded-xl p-4">
                <LinkCard
                  title={currentModule.title}
                  description={currentModule.description}
                  imageUrl={currentModule.image_url}
                  icon={Icon}
                  iconBgColor={currentModule.icon_color}
                  buttonColor={currentModule.button_color}
                  features={currentModule.features}
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleResetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
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
