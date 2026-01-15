import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

interface Outdoor {
  id: string;
  code: string;
  pdvName?: string;
  location?: string;
}

interface OutdoorSearchSelectProps {
  outdoors: Outdoor[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function OutdoorSearchSelect({
  outdoors,
  value,
  onValueChange,
  placeholder = "Buscar outdoor por código ou posto...",
  disabled = false,
}: OutdoorSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOutdoor = useMemo(() => {
    return outdoors.find(o => o.id === value);
  }, [outdoors, value]);

  const filteredOutdoors = useMemo(() => {
    if (!searchQuery.trim()) return outdoors;
    
    const query = searchQuery.toLowerCase().trim();
    return outdoors.filter(outdoor => 
      outdoor.code.toLowerCase().includes(query) ||
      outdoor.pdvName?.toLowerCase().includes(query) ||
      outdoor.location?.toLowerCase().includes(query)
    );
  }, [outdoors, searchQuery]);

  const handleSelect = (outdoorId: string) => {
    onValueChange(outdoorId);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedOutdoor ? (
            <span className="truncate">
              {selectedOutdoor.code} - {selectedOutdoor.pdvName || 'Sem posto'}
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Digite código ou posto..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhum outdoor encontrado.</CommandEmpty>
            <CommandGroup heading={`${filteredOutdoors.length} outdoor${filteredOutdoors.length !== 1 ? 's' : ''} disponíveis`}>
              {filteredOutdoors.map((outdoor) => (
                <CommandItem
                  key={outdoor.id}
                  value={outdoor.id}
                  onSelect={() => handleSelect(outdoor.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === outdoor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">{outdoor.code}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {outdoor.pdvName || 'Sem posto'} {outdoor.location ? `- ${outdoor.location}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
