import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X, Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface OutdoorOption {
  id: string;
  code: string;
  pdvName: string;
  location: string;
  hasContract?: boolean;
}

interface OutdoorMultiSelectProps {
  outdoors: OutdoorOption[];
  value: string[];
  onValueChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OutdoorMultiSelect({
  outdoors,
  value,
  onValueChange,
  placeholder = "Buscar e selecionar outdoors...",
  disabled = false,
}: OutdoorMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOutdoors = useMemo(() => {
    if (!search) return outdoors;
    const searchLower = search.toLowerCase();
    return outdoors.filter(
      outdoor =>
        outdoor.code.toLowerCase().includes(searchLower) ||
        outdoor.pdvName.toLowerCase().includes(searchLower) ||
        outdoor.location.toLowerCase().includes(searchLower)
    );
  }, [outdoors, search]);

  const selectedOutdoors = useMemo(() => {
    return outdoors.filter(o => value.includes(o.id));
  }, [outdoors, value]);

  const toggleOutdoor = (id: string) => {
    if (value.includes(id)) {
      onValueChange(value.filter(v => v !== id));
    } else {
      onValueChange([...value, id]);
    }
  };

  const removeOutdoor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter(v => v !== id));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-sm">{placeholder}</span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Digite código ou nome do posto..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Nenhum outdoor encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredOutdoors.map((outdoor) => {
                  const isSelected = value.includes(outdoor.id);
                  return (
                    <CommandItem
                      key={outdoor.id}
                      value={outdoor.id}
                      onSelect={() => toggleOutdoor(outdoor.id)}
                      className="cursor-pointer"
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground/50"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{outdoor.code}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground truncate">
                            {outdoor.pdvName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{outdoor.location}</span>
                        </div>
                      </div>
                      {outdoor.hasContract && !isSelected && (
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">
                          Com contrato
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Outdoors as Chips */}
      {selectedOutdoors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOutdoors.map((outdoor) => (
            <Badge 
              key={outdoor.id} 
              variant="secondary"
              className="pl-2 pr-1 py-1 flex items-center gap-1"
            >
              <span className="font-medium">{outdoor.code}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs truncate max-w-[120px]">{outdoor.pdvName}</span>
              <button
                type="button"
                onClick={(e) => removeOutdoor(outdoor.id, e)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} outdoor{value.length > 1 ? 's' : ''} selecionado{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
