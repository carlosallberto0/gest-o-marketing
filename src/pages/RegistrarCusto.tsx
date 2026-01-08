import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Upload, 
  Loader2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveSuppliers } from '@/hooks/useSuppliers';
import { usePDVsList } from '@/hooks/usePDVsList';
import { useCreateCustoExterno } from '@/hooks/useCustosExternos';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

type CustoTipo = 'material' | 'transporte' | 'mao_obra' | 'outro';

interface FormData {
  descricao: string;
  tipo: CustoTipo;
  valor_total: number;
  data_compra: string;
  fornecedor_id: string;
  teve_perdas: boolean;
  perda_descricao: string;
  perda_valor: number;
  comprovante_url: string;
  alocacao_tipo: 'unico' | 'multiplo';
  postos_selecionados: string[];
}

export default function RegistrarCusto() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    descricao: '',
    tipo: 'material',
    valor_total: 0,
    data_compra: new Date().toISOString().split('T')[0],
    fornecedor_id: '',
    teve_perdas: false,
    perda_descricao: '',
    perda_valor: 0,
    comprovante_url: '',
    alocacao_tipo: 'unico',
    postos_selecionados: [],
  });

  const { data: fornecedores } = useActiveSuppliers();
  const { data: postos } = usePDVsList();
  const createMutation = useCreateCustoExterno();

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `comprovante_${Date.now()}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, comprovante_url: publicUrl }));
      showToast.success('Comprovante enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast.error('Erro ao enviar comprovante');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Calculate percentages
    const postoCount = formData.postos_selecionados.length;
    const percentualPorPosto = postoCount > 0 ? 100 / postoCount : 0;

    const alocacoes = formData.postos_selecionados.map(postoId => ({
      posto_id: postoId,
      percentual_alocacao: percentualPorPosto,
    }));

    createMutation.mutate({
      descricao: formData.descricao,
      tipo: formData.tipo,
      valor_total: formData.valor_total,
      data_compra: formData.data_compra,
      fornecedor_id: formData.fornecedor_id,
      teve_perdas: formData.teve_perdas,
      perda_descricao: formData.teve_perdas ? formData.perda_descricao : undefined,
      perda_valor: formData.teve_perdas ? formData.perda_valor : 0,
      comprovante_url: formData.comprovante_url,
      alocacao_tipo: formData.alocacao_tipo,
      alocacoes,
    }, {
      onSuccess: () => {
        navigate('/custos-externos');
      },
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.descricao && formData.valor_total > 0;
      case 2:
        return !!formData.fornecedor_id;
      case 3:
        return true; // Perdas são opcionais
      case 4:
        return !!formData.comprovante_url;
      case 5:
        return formData.postos_selecionados.length > 0;
      default:
        return false;
    }
  };

  const custoLiquido = formData.valor_total - (formData.teve_perdas ? formData.perda_valor : 0);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/custos-externos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Registrar Custo do Fornecedor</h1>
            <p className="text-muted-foreground">Etapa {step} de 5</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <div 
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Descrição */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>1. O que foi cobrado pelo fornecedor?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="descricao">Descrição detalhada *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: 'Compra de 50m² de lona para 3 outdoors' ou 'Serviço de manutenção no posto X'"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo de custo *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as CustoTipo }))}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">📦 Material/Insumo</SelectItem>
                      <SelectItem value="transporte">🚚 Transporte</SelectItem>
                      <SelectItem value="mao_obra">👷 Mão de Obra</SelectItem>
                      <SelectItem value="outro">📝 Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="valor">Valor total cobrado (R$) *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_total || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_total: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="data">Data da compra/serviço</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data_compra}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_compra: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Fornecedor */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Qual fornecedor cobrou isso?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fornecedor">Selecione o fornecedor *</Label>
                <Select 
                  value={formData.fornecedor_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, fornecedor_id: value }))}
                >
                  <SelectTrigger id="fornecedor">
                    <SelectValue placeholder="Selecione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores?.filter(f => f.id).map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} - {f.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Perdas */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>3. O fornecedor informou perdas?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="teve-perdas"
                  checked={formData.teve_perdas}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    teve_perdas: checked as boolean,
                    perda_valor: checked ? prev.perda_valor : 0,
                    perda_descricao: checked ? prev.perda_descricao : '',
                  }))}
                />
                <Label htmlFor="teve-perdas" className="cursor-pointer">
                  Sim, houve perda de material durante a produção
                </Label>
              </div>

              {formData.teve_perdas && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                  <div>
                    <Label htmlFor="perda-desc">Descrição da perda</Label>
                    <Input
                      id="perda-desc"
                      value={formData.perda_descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, perda_descricao: e.target.value }))}
                      placeholder="Ex: '5m² de lona estragou na impressão'"
                    />
                  </div>

                  <div>
                    <Label htmlFor="perda-valor">Valor da perda (R$)</Label>
                    <Input
                      id="perda-valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.perda_valor || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, perda_valor: parseFloat(e.target.value) || 0 }))}
                      placeholder="Valor do material perdido"
                    />
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex gap-2 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm">
                        Esta informação será usada para calcular o custo efetivo por posto, 
                        descontando as perdas informadas pelo fornecedor.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Comprovante */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>4. Comprovante (print/nota fiscal)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                {formData.comprovante_url ? (
                  <div>
                    <div className="text-4xl mb-2">✅</div>
                    <p className="font-medium">Comprovante anexado</p>
                    <Button
                      variant="link"
                      onClick={() => window.open(formData.comprovante_url, '_blank')}
                      className="mt-2"
                    >
                      Ver comprovante
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, comprovante_url: '' }))}
                      className="ml-2"
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">📎</div>
                    <p className="mb-4 text-muted-foreground">Faça upload do print ou nota fiscal</p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <Button asChild disabled={uploading}>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Selecionar arquivo
                          </>
                        )}
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                💡 Tire um print da conversa com o fornecedor ou escaneie a nota fiscal
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Alocação */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>5. Para quais postos/outdoors esse custo se refere?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.alocacao_tipo === 'unico' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    alocacao_tipo: 'unico',
                    postos_selecionados: prev.postos_selecionados.slice(0, 1)
                  }))}
                >
                  Apenas um posto
                </Button>
                <Button
                  type="button"
                  variant={formData.alocacao_tipo === 'multiplo' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, alocacao_tipo: 'multiplo' }))}
                >
                  Vários postos
                </Button>
              </div>

              {formData.alocacao_tipo === 'multiplo' ? (
                <div>
                  <Label className="mb-2 block">Selecione os postos atendidos:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                    {postos?.map(posto => (
                      <div key={posto.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`posto-${posto.id}`}
                          checked={formData.postos_selecionados.includes(posto.id)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              postos_selecionados: checked
                                ? [...prev.postos_selecionados, posto.id]
                                : prev.postos_selecionados.filter(id => id !== posto.id)
                            }));
                          }}
                        />
                        <Label htmlFor={`posto-${posto.id}`} className="cursor-pointer text-sm">
                          {posto.name}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      💡 O sistema dividirá o custo igualmente entre os postos selecionados.
                      Você pode ajustar os percentuais manualmente depois.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="posto-unico">Selecione o posto:</Label>
                  <Select 
                    value={formData.postos_selecionados[0] || ''} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      postos_selecionados: value ? [value] : []
                    }))}
                  >
                    <SelectTrigger id="posto-unico">
                      <SelectValue placeholder="Selecione um posto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {postos?.filter(p => p.id).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary (always visible from step 2) */}
        {step >= 2 && (
          <Card className="bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resumo do Registro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição:</span>
                  <span className="font-medium">{formData.descricao || "Não informado"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total:</span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    R$ {formData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {formData.teve_perdas && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Perdas informadas:</span>
                    <span className="text-red-600">
                      -R$ {formData.perda_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Custo efetivo:</span>
                  <span className="font-bold text-green-800 dark:text-green-300">
                    R$ {custoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postos atendidos:</span>
                  <span>
                    {formData.postos_selecionados.length === 0 
                      ? "Não selecionados" 
                      : `${formData.postos_selecionados.length} posto(s)`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/custos-externos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Registrar Custo
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
