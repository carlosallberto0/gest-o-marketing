import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Loader2, Upload, RotateCcw, Save, FileText, Palette, Type, Layout, FileImage } from 'lucide-react';
import { useReportSettings, useUpdateReportSettings, defaultReportSettings, ReportSettings } from '@/hooks/useReportSettings';
import { supabase } from '@/integrations/supabase/client';

export function ReportSettingsManager() {
  const { data: settings, isLoading } = useReportSettings();
  const updateSettings = useUpdateReportSettings();
  const [localSettings, setLocalSettings] = useState<ReportSettings>(defaultReportSettings);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(localSettings, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const handleReset = () => {
    setLocalSettings(defaultReportSettings);
    setHasChanges(true);
  };

  const updateGlobalSetting = <K extends keyof ReportSettings['global']>(
    key: K,
    value: ReportSettings['global'][K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      global: { ...prev.global, [key]: value },
    }));
    setHasChanges(true);
  };

  const updateHeaderSetting = <K extends keyof ReportSettings['global']['header']>(
    key: K,
    value: ReportSettings['global']['header'][K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        header: { ...prev.global.header, [key]: value },
      },
    }));
    setHasChanges(true);
  };

  const updateFooterSetting = <K extends keyof ReportSettings['global']['footer']>(
    key: K,
    value: ReportSettings['global']['footer'][K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        footer: { ...prev.global.footer, [key]: value },
      },
    }));
    setHasChanges(true);
  };

  const updateBodySetting = <K extends keyof ReportSettings['global']['body']>(
    key: K,
    value: ReportSettings['global']['body'][K]
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        body: { ...prev.global.body, [key]: value },
      },
    }));
    setHasChanges(true);
  };

  const updateMarginSetting = (key: 'top' | 'bottom' | 'left' | 'right', value: number) => {
    setLocalSettings((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        margins: { ...prev.global.margins, [key]: value },
      },
    }));
    setHasChanges(true);
  };

  const updateTemplateSetting = (
    templateKey: string,
    key: string,
    value: string | boolean
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [templateKey]: {
          ...prev.templates[templateKey],
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `report-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      updateHeaderSetting('logo_url', publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Personalização de Relatórios
        </CardTitle>
        <CardDescription>
          Configure a aparência padrão dos relatórios PDF gerados pelo sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              <Layout className="h-4 w-4 mr-1 hidden sm:inline" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="header" className="text-xs sm:text-sm">
              <Type className="h-4 w-4 mr-1 hidden sm:inline" />
              Cabeçalho
            </TabsTrigger>
            <TabsTrigger value="footer" className="text-xs sm:text-sm">
              <Type className="h-4 w-4 mr-1 hidden sm:inline" />
              Rodapé
            </TabsTrigger>
            <TabsTrigger value="body" className="text-xs sm:text-sm">
              <Palette className="h-4 w-4 mr-1 hidden sm:inline" />
              Corpo
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm">
              <FileImage className="h-4 w-4 mr-1 hidden sm:inline" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Formato da Página</Label>
                  <Select
                    value={localSettings.global.page_format}
                    onValueChange={(value) => updateGlobalSetting('page_format', value as 'a4' | 'letter')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                      <SelectItem value="letter">Carta (216 × 279 mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Orientação</Label>
                  <RadioGroup
                    value={localSettings.global.page_orientation}
                    onValueChange={(value) => updateGlobalSetting('page_orientation', value as 'portrait' | 'landscape')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="portrait" id="portrait" />
                      <Label htmlFor="portrait" className="cursor-pointer">Retrato</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="landscape" id="landscape" />
                      <Label htmlFor="landscape" className="cursor-pointer">Paisagem</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Família da Fonte</Label>
                  <Select
                    value={localSettings.global.font_family}
                    onValueChange={(value) => updateGlobalSetting('font_family', value as 'helvetica' | 'times' | 'courier')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helvetica">Helvetica (Sans-serif)</SelectItem>
                      <SelectItem value="times">Times (Serif)</SelectItem>
                      <SelectItem value="courier">Courier (Monoespaçada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tamanho da Fonte Base: {localSettings.global.font_size}pt</Label>
                  <Slider
                    value={[localSettings.global.font_size]}
                    onValueChange={([value]) => updateGlobalSetting('font_size', value)}
                    min={8}
                    max={14}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Margens (mm)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Superior</Label>
                    <Input
                      type="number"
                      value={localSettings.global.margins.top}
                      onChange={(e) => updateMarginSetting('top', Number(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Inferior</Label>
                    <Input
                      type="number"
                      value={localSettings.global.margins.bottom}
                      onChange={(e) => updateMarginSetting('bottom', Number(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Esquerda</Label>
                    <Input
                      type="number"
                      value={localSettings.global.margins.left}
                      onChange={(e) => updateMarginSetting('left', Number(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Direita</Label>
                    <Input
                      type="number"
                      value={localSettings.global.margins.right}
                      onChange={(e) => updateMarginSetting('right', Number(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Header Settings Tab */}
          <TabsContent value="header" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Logomarca</Label>
                  <div className="flex items-center gap-4">
                    {localSettings.global.header.logo_url ? (
                      <img
                        src={localSettings.global.header.logo_url}
                        alt="Logo"
                        className="h-12 w-auto object-contain border rounded"
                      />
                    ) : (
                      <div className="h-12 w-24 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                        Sem logo
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <Button variant="outline" size="sm" disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {uploading ? 'Enviando...' : 'Upload'}
                      </Button>
                    </div>
                    {localSettings.global.header.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateHeaderSetting('logo_url', null)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Posição da Logo</Label>
                  <RadioGroup
                    value={localSettings.global.header.logo_position}
                    onValueChange={(value) => updateHeaderSetting('logo_position', value as 'left' | 'center' | 'right')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="left" id="logo-left" />
                      <Label htmlFor="logo-left" className="cursor-pointer">Esquerda</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="center" id="logo-center" />
                      <Label htmlFor="logo-center" className="cursor-pointer">Centro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="right" id="logo-right" />
                      <Label htmlFor="logo-right" className="cursor-pointer">Direita</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Altura da Logo: {localSettings.global.header.logo_height}mm</Label>
                  <Slider
                    value={[localSettings.global.header.logo_height]}
                    onValueChange={([value]) => updateHeaderSetting('logo_height', value)}
                    min={8}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Título Padrão</Label>
                  <Input
                    value={localSettings.global.header.title}
                    onChange={(e) => updateHeaderSetting('title', e.target.value)}
                    placeholder="Título do relatório"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.global.header.background_color}
                        onChange={(e) => updateHeaderSetting('background_color', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={localSettings.global.header.background_color}
                        onChange={(e) => updateHeaderSetting('background_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.global.header.text_color}
                        onChange={(e) => updateHeaderSetting('text_color', e.target.value)}
                        className="w-10 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={localSettings.global.header.text_color}
                        onChange={(e) => updateHeaderSetting('text_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-subtitle">Mostrar subtítulo</Label>
                    <Switch
                      id="show-subtitle"
                      checked={localSettings.global.header.show_subtitle}
                      onCheckedChange={(checked) => updateHeaderSetting('show_subtitle', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-date">Mostrar data de geração</Label>
                    <Switch
                      id="show-date"
                      checked={localSettings.global.header.show_date}
                      onCheckedChange={(checked) => updateHeaderSetting('show_date', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="header-all-pages">Repetir cabeçalho em todas as páginas</Label>
                    <Switch
                      id="header-all-pages"
                      checked={localSettings.global.header.show_on_all_pages}
                      onCheckedChange={(checked) => updateHeaderSetting('show_on_all_pages', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Footer Settings Tab */}
          <TabsContent value="footer" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Conteúdo do Rodapé</Label>
                  <Textarea
                    value={localSettings.global.footer.content}
                    onChange={(e) => updateFooterSetting('content', e.target.value)}
                    placeholder="Texto do rodapé com variáveis"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis disponíveis: {'{{pagina}}'}, {'{{total_paginas}}'}, {'{{data_geracao}}'}, {'{{hora_geracao}}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Alinhamento</Label>
                  <RadioGroup
                    value={localSettings.global.footer.alignment}
                    onValueChange={(value) => updateFooterSetting('alignment', value as 'left' | 'center' | 'right')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="left" id="footer-left" />
                      <Label htmlFor="footer-left" className="cursor-pointer">Esquerda</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="center" id="footer-center" />
                      <Label htmlFor="footer-center" className="cursor-pointer">Centro</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="right" id="footer-right" />
                      <Label htmlFor="footer-right" className="cursor-pointer">Direita</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cor do Texto</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.global.footer.text_color}
                      onChange={(e) => updateFooterSetting('text_color', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={localSettings.global.footer.text_color}
                      onChange={(e) => updateFooterSetting('text_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Label htmlFor="show-page-numbers">Mostrar números de página</Label>
                  <Switch
                    id="show-page-numbers"
                    checked={localSettings.global.footer.show_page_numbers}
                    onCheckedChange={(checked) => updateFooterSetting('show_page_numbers', checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Body Settings Tab */}
          <TabsContent value="body" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cor do Cabeçalho de Tabela</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.global.body.table_header_color}
                      onChange={(e) => updateBodySetting('table_header_color', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={localSettings.global.body.table_header_color}
                      onChange={(e) => updateBodySetting('table_header_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor das Linhas Alternadas (Zebra)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.global.body.table_stripe_color}
                      onChange={(e) => updateBodySetting('table_stripe_color', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={localSettings.global.body.table_stripe_color}
                      onChange={(e) => updateBodySetting('table_stripe_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor dos Títulos de Seção</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.global.body.section_title_color}
                      onChange={(e) => updateBodySetting('section_title_color', e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={localSettings.global.body.section_title_color}
                      onChange={(e) => updateBodySetting('section_title_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Densidade do Conteúdo</Label>
                  <RadioGroup
                    value={localSettings.global.body.density}
                    onValueChange={(value) => updateBodySetting('density', value as 'compact' | 'normal' | 'expanded')}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compact" id="density-compact" />
                      <Label htmlFor="density-compact" className="cursor-pointer">
                        Compacto - Menor espaçamento entre elementos
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id="density-normal" />
                      <Label htmlFor="density-normal" className="cursor-pointer">
                        Normal - Espaçamento padrão
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="expanded" id="density-expanded" />
                      <Label htmlFor="density-expanded" className="cursor-pointer">
                        Ampliado - Maior espaçamento entre elementos
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {Object.entries(localSettings.templates).map(([key, template]) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">
                    {key === 'outdoors' ? 'Outdoors' : key === 'service_orders' ? 'Ordens de Serviço' : 'Merchandising'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${key}-inherit`}>Herdar configurações globais</Label>
                    <Switch
                      id={`${key}-inherit`}
                      checked={template.inherit_global}
                      onCheckedChange={(checked) => updateTemplateSetting(key, 'inherit_global', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Título do Cabeçalho</Label>
                    <Input
                      value={template.header_title}
                      onChange={(e) => updateTemplateSetting(key, 'header_title', e.target.value)}
                      placeholder="Título específico do relatório"
                    />
                  </div>

                  {key === 'outdoors' && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${key}-images`}>Incluir imagens</Label>
                        <Switch
                          id={`${key}-images`}
                          checked={template.include_images ?? true}
                          onCheckedChange={(checked) => updateTemplateSetting(key, 'include_images', checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Qualidade das Imagens</Label>
                        <Select
                          value={template.image_quality ?? 'medium'}
                          onValueChange={(value) => updateTemplateSetting(key, 'image_quality', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa (menor tamanho)</SelectItem>
                            <SelectItem value="medium">Média (equilibrado)</SelectItem>
                            <SelectItem value="high">Alta (melhor qualidade)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${key}-group-city`}>Agrupar por cidade</Label>
                        <Switch
                          id={`${key}-group-city`}
                          checked={template.group_by_city ?? false}
                          onCheckedChange={(checked) => updateTemplateSetting(key, 'group_by_city', checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Ordenar por</Label>
                        <Select
                          value={template.sort_by ?? 'code'}
                          onValueChange={(value) => updateTemplateSetting(key, 'sort_by', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">Código</SelectItem>
                            <SelectItem value="city">Cidade</SelectItem>
                            <SelectItem value="pdv">PDV</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending || !hasChanges}>
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
