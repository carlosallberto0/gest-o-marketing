import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Building2 } from 'lucide-react';
import { MapPDV } from '@/hooks/useStrategicMapData';

interface MapSearchFiltersProps {
  pdvs: MapPDV[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedState: string;
  onStateChange: (value: string) => void;
  selectedCity: string;
  onCityChange: (value: string) => void;
}

export function MapSearchFilters({
  pdvs,
  searchTerm,
  onSearchChange,
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
}: MapSearchFiltersProps) {
  // Extract unique states and cities
  const states = useMemo(() => {
    const uniqueStates = [...new Set(pdvs.map(p => p.state).filter(Boolean))];
    return uniqueStates.sort();
  }, [pdvs]);

  const cities = useMemo(() => {
    const filteredPdvs = selectedState === 'all' 
      ? pdvs 
      : pdvs.filter(p => p.state === selectedState);
    const uniqueCities = [...new Set(filteredPdvs.map(p => p.city).filter(Boolean))];
    return uniqueCities.sort();
  }, [pdvs, selectedState]);

  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg space-y-3">
      <h3 className="font-semibold text-sm text-foreground">Buscar e Filtrar</h3>
      
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar PDV ou outdoor..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* State Filter */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3 w-3" />
          Estado
        </label>
        <Select value={selectedState} onValueChange={(value) => {
          onStateChange(value);
          onCityChange('all'); // Reset city when state changes
        }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Todos os estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {states.map(state => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Filter */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3" />
          Cidade
        </label>
        <Select value={selectedCity} onValueChange={onCityChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Todas as cidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {cities.map(city => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}