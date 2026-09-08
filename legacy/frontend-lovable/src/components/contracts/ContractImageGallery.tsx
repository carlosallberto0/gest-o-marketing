import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractImageGalleryProps {
  images: string[];
  title?: string;
}

export function ContractImageGallery({ images, title = "Páginas do Contrato" }: ContractImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
        <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
        <p className="text-sm">Nenhuma imagem do contrato</p>
      </div>
    );
  }

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
    setZoom(1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
    setZoom(1);
  };

  const handleDownloadCurrent = () => {
    if (selectedIndex === null) return;
    const link = document.createElement('a');
    link.href = images[selectedIndex];
    link.download = `contrato-pagina-${selectedIndex + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    images.forEach((url, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `contrato-pagina-${index + 1}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>
          {images.length > 1 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadAll}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Todas ({images.length})
            </Button>
          )}
        </div>

        {/* Thumbnail Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, index) => (
            <button
              key={index}
              onClick={() => {
                setSelectedIndex(index);
                setZoom(1);
              }}
              className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img 
                src={url} 
                alt={`Página ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                Pág. {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 bg-black/95 border-none flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10">
            <span className="text-white font-medium">
              Página {(selectedIndex ?? 0) + 1} de {images.length}
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={handleDownloadCurrent}
                title="Baixar esta página"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 relative overflow-auto flex items-center justify-center">
            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-black/50 text-white hover:bg-black/70"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 bg-black/50 text-white hover:bg-black/70"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && (
              <img
                src={images[selectedIndex]}
                alt={`Página ${selectedIndex + 1}`}
                className="max-h-full transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            )}
          </div>

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="px-4 py-3 bg-black/80 border-t border-white/10 overflow-x-auto">
              <div className="flex gap-2 justify-center">
                {images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedIndex(index);
                      setZoom(1);
                    }}
                    className={cn(
                      "relative w-16 h-20 rounded overflow-hidden border-2 shrink-0 transition-all",
                      selectedIndex === index 
                        ? "border-primary ring-2 ring-primary/50" 
                        : "border-white/20 hover:border-white/50"
                    )}
                  >
                    <img 
                      src={url} 
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] py-0.5 text-center">
                      {index + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
