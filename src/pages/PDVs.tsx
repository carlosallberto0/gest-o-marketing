import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockPDVs, getScoreBgColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  Search, 
  Plus, 
  MapPin,
  Store,
  Megaphone,
  ClipboardCheck,
  User,
  Filter,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'posto': return 'Posto';
    case 'conveniencia': return 'Conveniência';
    case 'both': return 'Posto + Conv.';
    default: return type;
  }
};

export default function PDVs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const filteredPDVs = mockPDVs.filter(pdv => {
    const matchesSearch = pdv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pdv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pdv.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || pdv.type === typeFilter;
    const matchesModule = moduleFilter === 'all' || pdv.activeModules.includes(moduleFilter as any);
    return matchesSearch && matchesType && matchesModule;
  });

  const stats = {
    total: mockPDVs.length,
    active: mockPDVs.filter(p => p.status === 'active').length,
    withMedia: mockPDVs.filter(p => p.activeModules.includes('media')).length,
    withMerch: mockPDVs.filter(p => p.activeModules.includes('merchandising')).length,
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">PDVs</h1>
            <p className="text-muted-foreground mt-1">Gestão de pontos de venda</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo PDV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total de PDVs</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Ativos</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <p className="text-sm text-primary">Com Mídia</p>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.withMedia}</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-foreground" />
              <p className="text-sm text-foreground">Com Merch</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.withMerch}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, código ou cidade..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="posto">Posto</SelectItem>
              <SelectItem value="conveniencia">Conveniência</SelectItem>
              <SelectItem value="both">Posto + Conv.</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos módulos</SelectItem>
              <SelectItem value="media">Mídia Externa</SelectItem>
              <SelectItem value="merchandising">Merchandising</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* PDVs Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPDVs.map((pdv, index) => (
            <div 
              key={pdv.id}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Fuel className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{pdv.name}</h3>
                    <p className="text-xs text-muted-foreground">{pdv.code}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Desativar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{pdv.city}, {pdv.state}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span>{getTypeLabel(pdv.type)}</span>
                </div>

                {pdv.managerName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{pdv.managerName}</span>
                  </div>
                )}

                {/* Modules */}
                <div className="flex gap-2 pt-2">
                  {pdv.activeModules.includes('media') && (
                    <Badge variant="outline" className="text-xs">
                      <Megaphone className="h-3 w-3 mr-1" />
                      Mídia
                    </Badge>
                  )}
                  {pdv.activeModules.includes('merchandising') && (
                    <Badge variant="outline" className="text-xs">
                      <ClipboardCheck className="h-3 w-3 mr-1" />
                      Merch
                    </Badge>
                  )}
                </div>

                {/* Scores */}
                <div className="flex gap-3 pt-2 border-t border-border">
                  {pdv.lastMerchScore !== undefined && (
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Score Merch</p>
                      <p className={cn("text-lg font-bold", getScoreBgColor(pdv.lastMerchScore).includes('success') ? 'text-success' : getScoreBgColor(pdv.lastMerchScore).includes('warning') ? 'text-warning' : 'text-destructive')}>
                        {pdv.lastMerchScore}%
                      </p>
                    </div>
                  )}
                  {pdv.totalOutdoors !== undefined && (
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Outdoors</p>
                      <p className="text-lg font-bold text-foreground">
                        {pdv.operationalOutdoors}/{pdv.totalOutdoors}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPDVs.length === 0 && (
          <div className="text-center py-12">
            <Fuel className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum PDV encontrado</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
