import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadPhoto } from '@/lib/storage';
import { showToast } from '@/lib/toast';

export interface GeoPhotoData {
  url: string;
  timestamp: number;
}

interface GeoPhotoUploadProps {
  value: GeoPhotoData[];
  onChange: (photos: GeoPhotoData[]) => void;
  maxPhotos?: number;
  className?: string;
  disabled?: boolean;
  folder?: string;
}

export function GeoPhotoUpload({
  value = [],
  onChange,
  maxPhotos = 5,
  className,
  disabled = false,
  folder = "evaluations"
}: GeoPhotoUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setIsLoading(true);

    try {
      const publicUrl = await uploadPhoto(file, folder);
      
      if (publicUrl) {
        const newPhoto: GeoPhotoData = {
          url: publicUrl,
          timestamp: Date.now(),
        };
        
        onChange([...value, newPhoto]);
        showToast.success('Foto enviada com sucesso!');
      } else {
        showToast.error('Erro ao enviar foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast.error('Erro ao enviar foto');
    } finally {
      setIsLoading(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = value.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const canAddMore = value.length < maxPhotos;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden inputs for camera and gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isLoading}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isLoading}
      />

      {/* Existing photos grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((photo, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={photo.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add photo buttons - separated camera and gallery */}
      {canAddMore && !disabled && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraClick}
            disabled={isLoading}
            className="h-auto py-4 flex-col gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            <span className="text-xs">Tirar Foto</span>
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleGalleryClick}
            disabled={isLoading}
            className="h-auto py-4 flex-col gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
            <span className="text-xs">Escolher do Rolo</span>
          </Button>
        </div>
      )}

      {/* Photo counter */}
      {canAddMore && !disabled && (
        <p className="text-xs text-muted-foreground text-center">
          {value.length}/{maxPhotos} fotos
        </p>
      )}
    </div>
  );
}
