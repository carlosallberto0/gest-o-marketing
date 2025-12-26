import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  PlayCircle,
  Eye,
  FileDown,
  RotateCcw
} from 'lucide-react';
import { useBulkImageUpload } from '@/hooks/useBulkImageUpload';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function BulkImageUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modoTeste, setModoTeste] = useState(true);
  const [parsedRecords, setParsedRecords] = useState<Array<{ codigo_outdoor: string; foto_url: string; nome_posto?: string; linha: number }>>([]);

  const {
    isProcessing,
    progress,
    result,
    parseCSV,
    processImageUpdate,
    downloadTemplate,
    exportErrorLog,
    resetState,
  } = useBulkImageUpload();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 10MB.',
      });
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Formato inválido', {
        description: 'Por favor, envie um arquivo CSV.',
      });
      return;
    }

    setSelectedFile(file);
    resetState();

    // Parse the file
    const content = await file.text();
    const records = parseCSV(content);
    setParsedRecords(records);

    if (records.length === 0) {
      toast.error('Arquivo vazio', {
        description: 'O arquivo não contém registros válidos.',
      });
    } else {
      toast.success(`${records.length} registros encontrados`, {
        description: 'Clique em "Iniciar Processamento" para continuar.',
      });
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || parsedRecords.length === 0) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    const importResult = await processImageUpdate(parsedRecords, modoTeste, selectedFile.name);

    if (importResult.erros.length === 0) {
      toast.success(
        modoTeste 
          ? 'Simulação concluída com sucesso!' 
          : `${importResult.sucessos} outdoors atualizados!`
      );
    } else {
      toast.warning(`${importResult.sucessos} sucessos, ${importResult.erros.length} erros`);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRecords([]);
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Carga em Massa de Imagens para Outdoors
          </h1>
          <p className="text-muted-foreground mt-1">
            Faça o upload de um arquivo CSV para atualizar as fotos de vários outdoors de uma vez.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Download */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  1. Baixar Template
                </CardTitle>
                <CardDescription>
                  Use o template para formatar corretamente seus dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar Template (CSV)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Colunas: <code className="bg-muted px-1 rounded">nome_posto</code> (opcional), <code className="bg-muted px-1 rounded">codigo_outdoor</code> e <code className="bg-muted px-1 rounded">foto_url</code>
                </p>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  2. Enviar Arquivo
                </CardTitle>
                <CardDescription>
                  Selecione seu arquivo CSV com os dados dos outdoors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRecords.length} registros
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">Clique para selecionar</p>
                      <p className="text-sm text-muted-foreground">ou arraste o arquivo aqui (máx. 10MB)</p>
                    </div>
                  )}
                </div>

                {/* Dry Run Option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="modoTeste"
                    checked={modoTeste}
                    onCheckedChange={(checked) => setModoTeste(checked === true)}
                  />
                  <Label htmlFor="modoTeste" className="text-sm cursor-pointer">
                    Apenas simular (não salva alterações)
                  </Label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleProcess}
                    disabled={!selectedFile || parsedRecords.length === 0 || isProcessing}
                    className="gap-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Iniciar Processamento'}
                  </Button>
                  {selectedFile && (
                    <Button variant="outline" onClick={handleReset} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">
                      Processando... {progress}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {result && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {result.erros.length === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    3. Resultado do Processamento
                    {result.modoTeste && (
                      <Badge variant="outline" className="ml-2">Simulação</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{result.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <p className="text-2xl font-bold text-success">{result.sucessos}</p>
                      <p className="text-xs text-muted-foreground">Sucessos</p>
                    </div>
                    <div className="text-center p-4 bg-destructive/10 rounded-lg">
                      <p className="text-2xl font-bold text-destructive">{result.erros.length}</p>
                      <p className="text-xs text-muted-foreground">Erros</p>
                    </div>
                  </div>

                  {result.erros.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Detalhes dos Erros</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportErrorLog(result.erros)}
                          className="gap-1"
                        >
                          <FileDown className="h-3 w-3" />
                          Exportar Erros
                        </Button>
                      </div>
                      <ScrollArea className="h-48 rounded border">
                        <div className="p-3 space-y-2">
                          {result.erros.map((erro, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-sm p-2 bg-destructive/5 rounded"
                            >
                              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">Linha {erro.linha}</span>
                                <span className="text-muted-foreground"> ({erro.codigo}): </span>
                                <span>{erro.erro}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {result.modoTeste && result.sucessos > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Simulação concluída</AlertTitle>
                      <AlertDescription>
                        Desmarque a opção "Apenas simular" e processe novamente para aplicar as alterações.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!result.modoTeste && result.sucessos > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/outdoors')}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Lista de Outdoors
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Instructions Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">📋 Instruções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Formato do arquivo:</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Arquivo CSV (separado por vírgula ou ponto e vírgula)</li>
                    <li>Primeira linha deve ser o cabeçalho</li>
                    <li>Máximo 10MB (~10.000 linhas)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Colunas:</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li><code className="bg-muted px-1 rounded">nome_posto</code> (opcional)</li>
                    <li><code className="bg-muted px-1 rounded">codigo_outdoor</code></li>
                    <li><code className="bg-muted px-1 rounded">foto_url</code></li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Dicas:</p>
                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Use o modo de simulação primeiro</li>
                    <li>Verifique se as URLs são acessíveis</li>
                    <li>Exporte os erros para correção</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚠️ Importante</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Esta operação irá substituir as fotos existentes dos outdoors.</p>
                <p>Certifique-se de que as URLs das imagens estejam corretas antes de processar.</p>
                <p>Todas as cargas são registradas no log de auditoria.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
