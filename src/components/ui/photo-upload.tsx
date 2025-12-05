import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Image as ImageIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  value?: string | null;
  onChange: (photoUrl: string | null) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PhotoUpload({ 
  value, 
  onChange, 
  className,
  disabled = false,
  placeholder = "Adicionar foto"
}: PhotoUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsLoading(true);

    try {
      // Convert to base64 for preview (in production, would upload to storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onChange(base64);
        setIsLoading(false);
      };
      reader.onerror = () => {
        alert('Erro ao processar a imagem');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Foto anexada"
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={triggerFileInput}
              >
                <Camera className="h-4 w-4 mr-1" />
                Trocar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={disabled || isLoading}
          className={cn(
            "w-full h-24 border-2 border-dashed border-border rounded-lg",
            "flex flex-col items-center justify-center gap-2",
            "text-muted-foreground hover:text-foreground hover:border-primary/50",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <>
              <Camera className="h-5 w-5" />
              <span className="text-xs">{placeholder}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Multi-photo upload component
interface MultiPhotoUploadProps {
  value: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  className?: string;
  disabled?: boolean;
}

export function MultiPhotoUpload({
  value = [],
  onChange,
  maxPhotos = 5,
  className,
  disabled = false
}: MultiPhotoUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxPhotos - value.length;
    const filesToProcess = files.slice(0, remainingSlots);

    setIsLoading(true);

    try {
      const newPhotos: string[] = [];
      
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        newPhotos.push(base64);
      }

      onChange([...value, ...newPhotos]);
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Photo grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((photo, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={photo}
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

      {/* Add button */}
      {canAddMore && !disabled && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={cn(
            "w-full py-3 border-2 border-dashed border-border rounded-lg",
            "flex items-center justify-center gap-2",
            "text-muted-foreground hover:text-foreground hover:border-primary/50",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="text-sm">
                Adicionar fotos ({value.length}/{maxPhotos})
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
