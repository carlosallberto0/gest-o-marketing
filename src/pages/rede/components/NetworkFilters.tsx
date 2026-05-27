import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServicoOption } from '@/hooks/usePublicNetwork';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  bandeira: string;
  onBandeira: (v: string) => void;
  bandeiras: string[];
  estado: string;
  onEstado: (v: string) => void;
  estados: string[];
  selectedServicos: string[];
  onToggleServico: (key: string) => void;
  servicos: ServicoOption[];
  view: 'grid' | 'table';
  onView: (v: 'grid' | 'table') => void;
}

export function NetworkFilters({
  search,
  onSearch,
  bandeira,
  onBandeira,
  bandeiras,
  estado,
  onEstado,
  estados,
  selectedServicos,
  onToggleServico,
  servicos,
  view,
  onView,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posto, cidade, bandeira..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bandeira || 'all'} onValueChange={(v) => onBandeira(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Bandeira" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas bandeiras</SelectItem>
            {bandeiras.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={estado || 'all'} onValueChange={(v) => onEstado(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="inline-flex rounded-md border border-border">
          <Button
            type="button"
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onView('grid')}
            aria-label="Cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={view === 'table' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onView('table')}
            aria-label="Tabela"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {servicos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {servicos.map((s) => {
            const active = selectedServicos.includes(s.key);
            return (
              <Badge
                key={s.key}
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => onToggleServico(s.key)}
              >
                {s.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
