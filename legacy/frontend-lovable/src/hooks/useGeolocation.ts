import { useState, useCallback } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = { code: 0, message: 'Geolocalização não suportada pelo navegador' };
        setError(error);
        reject(error);
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(position);
          setIsLoading(false);
          resolve(position);
        },
        (err) => {
          let message = 'Erro ao obter localização';
          switch (err.code) {
            case 1:
              message = 'Permissão de localização negada. Ative o GPS e permita o acesso.';
              break;
            case 2:
              message = 'Posição indisponível. Verifique sua conexão ou GPS.';
              break;
            case 3:
              message = 'Tempo esgotado. Tente novamente.';
              break;
          }
          const error = { code: err.code, message };
          setError(error);
          setIsLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    position,
    error,
    isLoading,
    getCurrentPosition,
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface ValidationResult {
  isValid: boolean;
  distance: number | null;
  message: string;
  accuracy: number;
  maxAllowedDistance: number;
}

export function validatePhotoGeolocation(
  photoLat: number,
  photoLng: number,
  photoAccuracy: number,
  outdoorLat: number | null,
  outdoorLng: number | null,
  validationRadius: number = 50
): ValidationResult {
  // If outdoor doesn't have coordinates, skip validation
  if (outdoorLat === null || outdoorLng === null) {
    return {
      isValid: true,
      distance: null,
      message: 'Outdoor sem coordenadas cadastradas. Validação geográfica ignorada.',
      accuracy: photoAccuracy,
      maxAllowedDistance: validationRadius,
    };
  }

  const distance = calculateDistance(photoLat, photoLng, outdoorLat, outdoorLng);
  const maxAllowedDistance = validationRadius + photoAccuracy;
  const isValid = distance <= maxAllowedDistance;

  return {
    isValid,
    distance: Math.round(distance * 100) / 100,
    message: isValid
      ? `Localização validada. Distância: ${distance.toFixed(0)}m`
      : `Localização inválida. Você está a ${distance.toFixed(0)}m do outdoor. Máximo permitido: ${maxAllowedDistance.toFixed(0)}m`,
    accuracy: photoAccuracy,
    maxAllowedDistance,
  };
}
