import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { getStatusColor, getStatusLabel } from '@/lib/helpers';
import { toGoogleMapsUrl } from '@/lib/googleMaps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Search, 
  Plus, 
  MapPin, 
  Maximize,
  Filter,
  Eye,
  Loader2,
  ExternalLink,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewOutdoorDialog } from '@/components/dialogs/NewOutdoorDialog';
import { BulkImportDialog } from '@/components/map/BulkImportDialog';
import { usePDVs } from '@/hooks/usePDVs';

export default function Outdoors() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdvFilter, setPdvFilter] = useState<string>('all');
  const [isNewOutdoorOpen, setIsNewOutdoorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { data: outdoors = [], isLoading, refetch } = useOutdoors();
  const { data: pdvs = [] } = usePDVs();


  const filteredOutdoors = outdoors.filter(outdoor => {
    const matchesSearch = outdoor.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outdoor.pdvName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outdoor.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || outdoor.status === statusFilter;
    const matchesPdv = pdvFilter === 'all' || outdoor.pdvId === pdvFilter;
    return matchesSearch && matchesStatus && matchesPdv;
  });

  const stats = {
    total: outdoors.length,
    operational: outdoors.filter(o => o.status === 'operational').length,
    nonOperational: outdoors.filter(o => o.status === 'non_operational').length,
    pending: outdoors.filter(o => o.status === 'pending_evaluation').length,
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Outdoors</h1>
            <p className="text-muted-foreground mt-1">Gestão de mídia externa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
            <Button onClick={() => setIsNewOutdoorOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Outdoor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Operacionais</p>
            <p className="text-2xl font-bold text-success">{stats.operational}</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
            <p className="text-sm text-destructive">Não Operacionais</p>
            <p className="text-2xl font-bold text-destructive">{stats.nonOperational}</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <p className="text-sm text-warning">Pendentes</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por código, PDV ou localização..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="operational">Operacional</SelectItem>
              <SelectItem value="non_operational">Não Operacional</SelectItem>
              <SelectItem value="pending_evaluation">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pdvFilter} onValueChange={setPdvFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="PDV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os PDVs</SelectItem>
              {pdvs.filter(p => p.active_modules?.includes('media')).map(pdv => (
                <SelectItem key={pdv.id} value={pdv.id}>{pdv.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Outdoors Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOutdoors.map((outdoor, index) => (
            <div 
              key={outdoor.id}
              className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="aspect-video bg-muted relative">
                <img 
                  src={outdoor.photoUrl || '/placeholder.svg'} 
                  alt={outdoor.code}
                  className="w-full h-full object-cover"
                />
                <Badge className={cn(
                  "absolute top-3 right-3",
                  getStatusColor(outdoor.status)
                )}>
                  {getStatusLabel(outdoor.status)}
                </Badge>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{outdoor.code}</h3>
                    <p className="text-sm text-muted-foreground">{outdoor.pdvName}</p>
                  </div>
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                
                <div className="space-y-2 text-sm">
                  {outdoor.locationUrl ? (
                    <a 
                      href={toGoogleMapsUrl(outdoor.locationUrl) || outdoor.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[200px]">{outdoor.location}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{outdoor.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Maximize className="h-4 w-4" />
                    <span>{outdoor.width}m x {outdoor.height}m ({outdoor.area}m²)</span>
                  </div>
                </div>

                {outdoor.nonOperationalReason && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                    {outdoor.nonOperationalReason}
                  </p>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate(`/outdoor/${outdoor.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredOutdoors.length === 0 && (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum outdoor encontrado</p>
          </div>
        )}
      </div>

      <NewOutdoorDialog open={isNewOutdoorOpen} onOpenChange={setIsNewOutdoorOpen} />
      <BulkImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} onSuccess={() => refetch()} />
    </AppLayout>
  );
}
