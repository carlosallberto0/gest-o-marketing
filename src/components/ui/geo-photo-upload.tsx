import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload, MapPin, CheckCircle, AlertTriangle, Loader2, ImageIcon } from 'lucide-react';
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
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { getCurrentPosition } = useGeolocation();

  const getGpsPosition = async (): Promise<GeolocationPosition | null> => {
    setGpsStatus('getting');
    
    try {
      const position = await getCurrentPosition();
      setCurrentPosition(position);
      
      // Check GPS accuracy
      if (position.accuracy > 30) {
        setGpsStatus('ready');
        setShowGpsWarning(true);
        return null; // Will continue after warning is handled
      }
      
      setGpsStatus('ready');
      return position;
    } catch (error: any) {
      setGpsStatus('error');
      toast.error(error.message || 'Erro ao obter localização');
      return null;
    }
  };

  const handleCameraClick = async () => {
    const position = await getGpsPosition();
    if (position) {
      cameraInputRef.current?.click();
    }
  };

  const handleGalleryClick = async () => {
    const position = await getGpsPosition();
    if (position) {
      galleryInputRef.current?.click();
    }
  };

  const handleGpsRetry = async () => {
    setShowGpsWarning(false);
    // Re-trigger the flow
    const position = await getGpsPosition();
    if (position) {
      // User needs to click again after retry
      setGpsStatus('ready');
    }
  };

  const handleGpsContinueCamera = () => {
    setShowGpsWarning(false);
    cameraInputRef.current?.click();
  };

  const handleGpsContinueGallery = () => {
    setShowGpsWarning(false);
    galleryInputRef.current?.click();
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
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  };

  const handleGeolocationRetry = () => {
    setShowGeolocationAlert(false);
    setPendingFile(null);
    setCurrentPosition(null);
    setGpsStatus('idle');
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
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
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
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
        disabled={disabled}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
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

      {/* Add photo buttons - separated camera and gallery */}
      {canAddMore && !disabled && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraClick}
            disabled={isLoading || gpsStatus === 'getting'}
            className="h-auto py-4 flex-col gap-2"
          >
            {gpsStatus === 'getting' ? (
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
            disabled={isLoading || gpsStatus === 'getting'}
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
        onContinue={handleGpsContinueCamera}
      />
    </div>
  );
}
