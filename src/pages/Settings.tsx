import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Upload, 
  Save, 
  Image,
  Moon,
  Sun,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function Settings() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState('default');
  const [systemName, setSystemName] = useState('SR Off Trade Marketing');
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        toast.success('Logo carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    const palette = colorPalettes.find(p => p.id === paletteId);
    if (palette) {
      document.documentElement.style.setProperty('--primary', palette.colors.primary);
      toast.success(`Paleta "${palette.name}" aplicada!`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simular salvamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Salvar no localStorage
    const settings = {
      systemName,
      logo: logoPreview,
      palette: selectedPalette,
    };
    localStorage.setItem('systemSettings', JSON.stringify(settings));
    
    setIsSaving(false);
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <AppLayout>
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
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="branding">
              <Image className="h-4 w-4 mr-2" />
              Marca
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Aparência
            </TabsTrigger>
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
                        />
                        <label htmlFor="logo-upload" className="cursor-pointer">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">Clique para enviar</p>
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
                  <button className="flex-1 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all">
                    <Sun className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <p className="text-sm font-medium text-center">Claro</p>
                  </button>
                  <button className="flex-1 p-4 rounded-xl border-2 border-primary bg-primary/5 transition-all">
                    <Moon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-center">Escuro</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
