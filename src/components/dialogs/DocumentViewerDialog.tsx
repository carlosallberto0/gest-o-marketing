import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Download } from 'lucide-react';

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string | null;
  title?: string;
  fileName?: string;
}

export function DocumentViewerDialog({ 
  open, 
  onOpenChange, 
  documentUrl, 
  title = "Documento do Contrato",
  fileName = "documento.pdf"
}: DocumentViewerDialogProps) {
  if (!documentUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {/* PDF Viewer via iframe */}
        <div className="flex-1 p-4 bg-muted/30">
          <iframe 
            src={documentUrl}
            className="w-full h-full rounded-lg border border-border bg-background"
            title="Visualização do documento"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row justify-end gap-2 bg-card">
          <Button 
            variant="outline" 
            onClick={() => window.open(documentUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em nova aba
          </Button>
          <a 
            href={documentUrl}
            download={fileName}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Download className="h-4 w-4" />
            Baixar documento
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
