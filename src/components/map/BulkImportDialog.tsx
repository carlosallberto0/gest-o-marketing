import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, CheckCircle, AlertCircle, Download, X, FileDown } from 'lucide-react';
import { useBulkImport, ImportRecord, generateCSVTemplate } from '@/hooks/useBulkImport';
import { toast } from 'sonner';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'preview' | 'processing' | 'result';

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [options, setOptions] = useState({
    updateExisting: false,
    ignoreDuplicates: true,
    defaultStatus: 'pre_cadastrado'
  });

  const { 
    parseFile, 
    validateRecords, 
    processImport, 
    exportErrorLog,
    isProcessing, 
    progress, 
    summary,
    setSummary 
  } = useBulkImport();

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_importacao.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template baixado!');
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    await handleFile(droppedFile);
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFile(selectedFile);
    }
  }, []);

  const handleFile = async (selectedFile: File) => {
    // Validate file size (4MB limit as requested)
    if (selectedFile.size > 4 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Limite: 4MB');
      return;
    }

    // Validate file type
    const extension = selectedFile.name.toLowerCase().split('.').pop();
    if (!['csv', 'json'].includes(extension || '')) {
      toast.error('Formato não suportado. Use CSV ou JSON.');
      return;
    }

    setFile(selectedFile);

    try {
      const parsed = await parseFile(selectedFile);
      setRecords(parsed.records);
      
      const { errors } = validateRecords(parsed.records);
      setValidationErrors(errors);
      
      if (parsed.records.length === 0) {
        toast.error('Nenhum registro válido encontrado no arquivo');
        return;
      }
      
      setStep('preview');
    } catch (error: any) {
      toast.error('Erro ao processar arquivo: ' + error.message);
    }
  };

  const handleImport = async () => {
    setStep('processing');
    
    try {
      await processImport(records, options);
      setStep('result');
      onSuccess?.();
    } catch (error: any) {
      toast.error('Erro na importação: ' + error.message);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setRecords([]);
    setValidationErrors([]);
    setSummary(null);
    onOpenChange(false);
  };

  const postos = records.filter(r => r.tipo === 'posto');
  const outdoors = records.filter(r => r.tipo === 'outdoor');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importação em Massa
          </DialogTitle>
          <DialogDescription>
            Importe postos e outdoors a partir de um arquivo CSV ou JSON
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {/* Download Template Button */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileDown className="h-4 w-4 mr-2" />
                Baixar Template CSV
              </Button>
            </div>

            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileInput}
              />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: CSV, JSON (máx. 4MB)
              </p>
            </div>

            {/* Format Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium">Campos obrigatórios:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>tipo</strong>: "posto" ou "outdoor"</li>
                <li><strong>nome</strong>: Nome do posto ou outdoor</li>
                <li><strong>latitude</strong>: Coordenada (ex: -23.5505)</li>
                <li><strong>longitude</strong>: Coordenada (ex: -46.6333)</li>
                <li><strong>posto_referencia</strong>: Obrigatório para outdoors (nome do posto associado)</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {((file?.size || 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setStep('upload')}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-500">{postos.length}</p>
                <p className="text-sm text-muted-foreground">Postos</p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-2xl font-bold text-green-500">{outdoors.length}</p>
                <p className="text-sm text-muted-foreground">Outdoors</p>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {validationErrors.length} avisos de validação
                  </span>
                </div>
                <ScrollArea className="max-h-32">
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {validationErrors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li className="text-destructive font-medium">
                        ... e mais {validationErrors.length - 10} avisos
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Lat/Lng</TableHead>
                    <TableHead>Referência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 10).map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant={record.tipo === 'posto' ? 'default' : 'secondary'}>
                          {record.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {record.nome}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {record.posto_referencia || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {records.length > 10 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                  Mostrando 10 de {records.length} registros
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="font-medium">Opções de Importação</p>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={options.updateExisting}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, updateExisting: !!checked }))
                  }
                />
                <Label htmlFor="updateExisting">
                  Atualizar postos existentes (por nome)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ignoreDuplicates"
                  checked={options.ignoreDuplicates}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, ignoreDuplicates: !!checked }))
                  }
                />
                <Label htmlFor="ignoreDuplicates">
                  Ignorar registros duplicados
                </Label>
              </div>
              
              <div className="flex items-center gap-4">
                <Label>Status padrão:</Label>
                <Select
                  value={options.defaultStatus}
                  onValueChange={(value) => 
                    setOptions(prev => ({ ...prev, defaultStatus: value }))
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_cadastrado">Pré-cadastrado</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={records.length === 0}>
                Iniciar Importação ({records.length} registros)
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-6">
            <div className="animate-pulse">
              <Upload className="h-16 w-16 mx-auto text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium mb-2">Importando dados...</p>
              <p className="text-sm text-muted-foreground">
                Processando {records.length} registros
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
            </div>
          </div>
        )}

        {step === 'result' && summary && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              {summary.erros.length === 0 ? (
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              )}
              <h3 className="text-xl font-semibold mb-2">
                Importação {summary.erros.length === 0 ? 'Concluída' : 'Concluída com Avisos'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                <p className="text-3xl font-bold text-green-500">{summary.postos_criados}</p>
                <p className="text-sm text-muted-foreground">Postos importados</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                <p className="text-3xl font-bold text-blue-500">{summary.outdoors_criados}</p>
                <p className="text-sm text-muted-foreground">Outdoors importados</p>
              </div>
            </div>

            {summary.erros.length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-destructive">
                    {summary.erros.length} registros com erro
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportErrorLog(summary.erros)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Log de Erros
                  </Button>
                </div>
                <ScrollArea className="max-h-32">
                  <ul className="text-sm space-y-1">
                    {summary.erros.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-muted-foreground">
                        • Linha {error.linha}: {error.tipo} "{error.nome}" - {error.erro}
                      </li>
                    ))}
                    {summary.erros.length > 5 && (
                      <li className="text-destructive">
                        ... e mais {summary.erros.length - 5} erros
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-center">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
