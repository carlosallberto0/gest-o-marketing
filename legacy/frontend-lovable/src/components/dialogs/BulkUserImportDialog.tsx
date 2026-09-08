import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  Link2,
  FileDown,
} from 'lucide-react';
import { useBulkUserImport, ParsedUserRecord, ImportResult } from '@/hooks/useBulkUserImport';
import { cn } from '@/lib/utils';

type ImportStep = 'upload' | 'preview' | 'processing' | 'result';

interface BulkUserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkUserImportDialog({ open, onOpenChange }: BulkUserImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const {
    isProcessing,
    progress,
    summary,
    parsedRecords,
    generateTemplate,
    parseFile,
    processImport,
    exportAccessLinks,
    exportErrorLog,
    reset,
  } = useBulkUserImport();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      await parseFile(file);
      setStep('preview');
    }
  }, [parseFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await parseFile(file);
      setStep('preview');
    }
  }, [parseFile]);

  const handleStartImport = useCallback(async () => {
    setStep('processing');
    await processImport(parsedRecords);
    setStep('result');
  }, [processImport, parsedRecords]);

  const handleClose = useCallback(() => {
    reset();
    setStep('upload');
    setSelectedFile(null);
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const validCount = parsedRecords.filter(r => r.isValid).length;
  const invalidCount = parsedRecords.filter(r => !r.isValid).length;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'manager': return 'Gerente';
      case 'director': return 'Diretor';
      case 'coordenador_compras': return 'Coord. Compras';
      case 'convenience_coordinator': return 'Coord. Conveniência';
      default: return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Usuários em Massa
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo Excel ou CSV com os dados dos usuários'}
            {step === 'preview' && 'Revise os dados antes de importar'}
            {step === 'processing' && 'Processando importação...'}
            {step === 'result' && 'Importação concluída'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Arraste um arquivo aqui</p>
                <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild>
                    <span>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-4">
                  Formatos aceitos: .xlsx, .xls, .csv
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Modelo de Planilha
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Baixe o template com os campos corretos para importação.
                </p>
                <Button variant="outline" size="sm" onClick={generateTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-medium mb-2">Campos da Planilha</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><Badge variant="outline">nome</Badge> - Nome completo</div>
                  <div><Badge variant="outline">email</Badge> - Email único</div>
                  <div><Badge variant="outline">perfil</Badge> - gerente, diretor, etc</div>
                  <div><Badge variant="outline">pdv</Badge> - Nome do posto (opcional)</div>
                  <div><Badge variant="outline">modulos</Badge> - media, merchandising</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-card border rounded-lg p-3 flex-1">
                  <p className="text-sm text-muted-foreground">Arquivo</p>
                  <p className="font-medium truncate">{selectedFile?.name}</p>
                </div>
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success">{validCount}</p>
                  <p className="text-xs text-success">válidos</p>
                </div>
                {invalidCount > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-destructive">{invalidCount}</p>
                    <p className="text-xs text-destructive">com erros</p>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>PDV</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRecords.slice(0, 50).map((record) => (
                      <TableRow key={record.linha} className={!record.isValid ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-muted-foreground">{record.linha}</TableCell>
                        <TableCell className="font-medium">{record.nome || '-'}</TableCell>
                        <TableCell>{record.email || '-'}</TableCell>
                        <TableCell>
                          {record.perfil ? (
                            <Badge variant="outline">{getRoleLabel(record.perfil)}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{record.pdv || '-'}</TableCell>
                        <TableCell>
                          {record.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive truncate max-w-[150px]" title={record.errors.join('; ')}>
                                {record.errors[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {parsedRecords.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Exibindo 50 de {parsedRecords.length} registros
                </p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { setStep('upload'); setSelectedFile(null); }}>
                  Voltar
                </Button>
                <Button 
                  onClick={handleStartImport} 
                  disabled={validCount === 0}
                >
                  Importar {validCount} usuário{validCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-6">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
              <div>
                <p className="text-lg font-medium mb-2">Processando importação...</p>
                <p className="text-muted-foreground">
                  {Math.round(progress * validCount / 100)} de {validCount} usuários processados
                </p>
              </div>
              <Progress value={progress} className="max-w-md mx-auto" />
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border rounded-lg p-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-success mb-2" />
                  <p className="text-2xl font-bold text-success">{summary.criados}</p>
                  <p className="text-sm text-success">Criados</p>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                  <XCircle className="h-6 w-6 mx-auto text-destructive mb-2" />
                  <p className="text-2xl font-bold text-destructive">{summary.erros}</p>
                  <p className="text-sm text-destructive">Erros</p>
                </div>
              </div>

              {summary.criados > 0 && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                  <h4 className="font-medium text-success mb-2 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Links de Acesso Gerados
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {summary.criados} links de acesso foram gerados. Baixe o arquivo para compartilhar com os usuários.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => exportAccessLinks(summary.results)}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Links de Acesso
                  </Button>
                </div>
              )}

              {summary.erros > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Registros com Erro
                  </h4>
                  <ScrollArea className="h-[150px] mb-3">
                    <div className="space-y-1">
                      {summary.results.filter(r => !r.success).slice(0, 20).map((r, i) => (
                        <div key={i} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground">Linha {r.linha}:</span>
                          <span>{r.nome} - {r.error}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button variant="outline" size="sm" onClick={() => exportErrorLog(summary.results)}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Log de Erros
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleClose}>
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
