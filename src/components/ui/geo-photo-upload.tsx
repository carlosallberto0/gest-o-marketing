import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload, MapPin, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadPhoto } from '@/lib/storage';
import { toast } from 'sonner';
import { useGeolocation, validatePhotoGeolocation, ValidationResult, GeolocationPosition } from '@/hooks/useGeolocation';
import { GeolocationAlertDialog } from '@/components/dialogs/GeolocationAlertDialog';
import { GpsAccuracyWarningDialog } from '@/components/dialogs/GpsAccuracyWarningDialog';

export interface GeoPhotoData {
  url: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isValid: boolean;
  distance: number | null;
  timestamp: number;
}

interface GeoPhotoUploadProps {
  value: GeoPhotoData[];
  onChange: (photos: GeoPhotoData[]) => void;
  outdoorLat: number | null;
  outdoorLng: number | null;
  validationRadius?: number;
  maxPhotos?: number;
  className?: string;
  disabled?: boolean;
  folder?: string;
}

export function GeoPhotoUpload({
  value = [],
  onChange,
  outdoorLat,
  outdoorLng,
  validationRadius = 50,
  maxPhotos = 5,
  className,
  disabled = false,
  folder = "evaluations"
}: GeoPhotoUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'getting' | 'ready' | 'error'>('idle');
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showGeolocationAlert, setShowGeolocationAlert] = useState(false);
  const [showGpsWarning, setShowGpsWarning] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getCurrentPosition } = useGeolocation();

  const handleCaptureClick = async () => {
    setGpsStatus('getting');
    
    try {
      const position = await getCurrentPosition();
      setCurrentPosition(position);
      
      // Check GPS accuracy
      if (position.accuracy > 30) {
        setGpsStatus('ready');
        setShowGpsWarning(true);
        return;
      }
      
      setGpsStatus('ready');
      fileInputRef.current?.click();
    } catch (error: any) {
      setGpsStatus('error');
      toast.error(error.message || 'Erro ao obter localização');
    }
  };

  const handleGpsRetry = async () => {
    setShowGpsWarning(false);
    await handleCaptureClick();
  };

  const handleGpsContinue = () => {
    setShowGpsWarning(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPosition) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    // Validate geolocation
    const validation = validatePhotoGeolocation(
      currentPosition.latitude,
      currentPosition.longitude,
      currentPosition.accuracy,
      outdoorLat,
      outdoorLng,
      validationRadius
    );

    setValidationResult(validation);

    if (!validation.isValid && outdoorLat !== null && outdoorLng !== null) {
      setPendingFile(file);
      setShowGeolocationAlert(true);
      return;
    }

    // If valid or no outdoor coordinates, proceed with upload
    await processFileUpload(file, validation);
  };

  const processFileUpload = async (file: File, validation: ValidationResult) => {
    if (!currentPosition) return;

    setIsLoading(true);

    try {
      const publicUrl = await uploadPhoto(file, folder);
      
      if (publicUrl) {
        const newPhoto: GeoPhotoData = {
          url: publicUrl,
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
          isValid: validation.isValid,
          distance: validation.distance,
          timestamp: Date.now(),
        };
        
        onChange([...value, newPhoto]);
        toast.success(validation.isValid 
          ? 'Foto validada e enviada!' 
          : 'Foto enviada (localização não validada)'
        );
      } else {
        toast.error('Erro ao enviar foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsLoading(false);
      setGpsStatus('idle');
      setCurrentPosition(null);
      setPendingFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGeolocationRetry = () => {
    setShowGeolocationAlert(false);
    setPendingFile(null);
    setCurrentPosition(null);
    setGpsStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Re-trigger capture flow
    setTimeout(() => handleCaptureClick(), 100);
  };

  const handleGeolocationContinue = async () => {
    setShowGeolocationAlert(false);
    if (pendingFile && validationResult) {
      await processFileUpload(pendingFile, validationResult);
    }
  };

  const handleGeolocationCancel = () => {
    setShowGeolocationAlert(false);
    setPendingFile(null);
    setCurrentPosition(null);
    setGpsStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* GPS Status indicator */}
      {gpsStatus !== 'idle' && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg text-sm",
          gpsStatus === 'getting' && "bg-primary/10 text-primary",
          gpsStatus === 'ready' && "bg-success/10 text-success",
          gpsStatus === 'error' && "bg-destructive/10 text-destructive"
        )}>
          {gpsStatus === 'getting' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Obtendo localização GPS...</span>
            </>
          )}
          {gpsStatus === 'ready' && currentPosition && (
            <>
              <MapPin className="h-4 w-4" />
              <span>GPS pronto (±{currentPosition.accuracy.toFixed(0)}m)</span>
            </>
          )}
          {gpsStatus === 'error' && (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>Erro no GPS. Verifique as permissões.</span>
            </>
          )}
        </div>
      )}

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
              {/* Validation badge */}
              <div className={cn(
                "absolute top-1 left-1 p-1 rounded-full",
                photo.isValid ? "bg-success" : "bg-warning"
              )}>
                {photo.isValid ? (
                  <CheckCircle className="h-3 w-3 text-success-foreground" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-warning-foreground" />
                )}
              </div>
              {/* Distance info */}
              {photo.distance !== null && (
                <div className="absolute bottom-1 left-1 right-1 bg-background/80 text-xs px-1.5 py-0.5 rounded text-center">
                  {photo.distance.toFixed(0)}m
                </div>
              )}
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

      {/* Add photo button */}
      {canAddMore && !disabled && (
        <button
          type="button"
          onClick={handleCaptureClick}
          disabled={isLoading || gpsStatus === 'getting'}
          className={cn(
            "w-full py-4 border-2 border-dashed border-border rounded-lg",
            "flex flex-col items-center justify-center gap-2",
            "text-muted-foreground hover:text-foreground hover:border-primary/50",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : gpsStatus === 'getting' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Obtendo GPS...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                <MapPin className="h-4 w-4" />
              </div>
              <span className="text-sm">
                Tirar foto com validação GPS ({value.length}/{maxPhotos})
              </span>
            </>
          )}
        </button>
      )}

      {/* Info about outdoor coordinates */}
      {outdoorLat === null || outdoorLng === null ? (
        <p className="text-xs text-warning flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Outdoor sem coordenadas cadastradas. Validação geográfica desabilitada.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Raio de validação: {validationRadius}m
        </p>
      )}

      {/* Dialogs */}
      <GeolocationAlertDialog
        open={showGeolocationAlert}
        onOpenChange={setShowGeolocationAlert}
        validationResult={validationResult}
        onRetry={handleGeolocationRetry}
        onContinue={handleGeolocationContinue}
        onCancel={handleGeolocationCancel}
      />

      <GpsAccuracyWarningDialog
        open={showGpsWarning}
        onOpenChange={setShowGpsWarning}
        accuracy={currentPosition?.accuracy || 0}
        onRetry={handleGpsRetry}
        onContinue={handleGpsContinue}
      />
    </div>
  );
}
