import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useAllMonthlyReviews, OutdoorMonthlyReview } from '@/hooks/useOutdoorMonthlyReviews';
import { 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  User,
  Eye,
  FileSpreadsheet,
  Image,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  approved: { label: 'Aprovado', color: 'bg-green-500', icon: CheckCircle },
  needs_maintenance: { label: 'Precisa Manutenção', color: 'bg-orange-500', icon: AlertTriangle },
};

export default function OutdoorReviews() {
  const { profile } = useAuth();
  const { data: reviews, isLoading } = useAllMonthlyReviews();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<OutdoorMonthlyReview | null>(null);
  
  // Filters
  const [monthFilter, setMonthFilter] = useState('all');
  const [reviewerFilter, setReviewerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get unique months from reviews
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    reviews?.forEach(review => {
      months.add(review.review_month);
    });
    return Array.from(months).sort().reverse();
  }, [reviews]);

  // Get unique reviewers from reviews
  const uniqueReviewers = useMemo(() => {
    const reviewers = new Map<string, string>();
    reviews?.forEach(review => {
      if (review.reviewer) {
        reviewers.set(review.reviewer.id, review.reviewer.name);
      }
    });
    return Array.from(reviewers.entries());
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    return reviews.filter(review => {
      // Search filter
      const matchesSearch = 
        review.outdoor?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.outdoor?.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Month filter
      const matchesMonth = monthFilter === 'all' || review.review_month === monthFilter;
      
      // Reviewer filter
      const matchesReviewer = reviewerFilter === 'all' || review.reviewer?.id === reviewerFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
      
      return matchesSearch && matchesMonth && matchesReviewer && matchesStatus;
    });
  }, [reviews, searchTerm, monthFilter, reviewerFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: filteredReviews.length,
      approved: filteredReviews.filter(r => r.status === 'approved').length,
      needsMaintenance: filteredReviews.filter(r => r.status === 'needs_maintenance').length,
    };
  }, [filteredReviews]);

  const handleExport = () => {
    if (!filteredReviews.length) return;

    const exportData = filteredReviews.map(review => ({
      'Data': format(new Date(review.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Mês de Referência': format(new Date(review.review_month), 'MMMM yyyy', { locale: ptBR }),
      'Outdoor': review.outdoor?.code || '',
      'Localização': review.outdoor?.location || '',
      'Revisor': review.reviewer?.name || '',
      'Status': review.status === 'approved' ? 'Aprovado' : 'Precisa Manutenção',
      'Observações': review.observations || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Revisões');
    XLSX.writeFile(workbook, `revisoes_outdoors_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico de Revisões de Outdoors</h1>
            <p className="text-muted-foreground">Visualize todas as revisões mensais de outdoors com comparativo de fotos</p>
          </div>
          <Button onClick={handleExport} disabled={!filteredReviews.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Revisões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aprovados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Precisando Manutenção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.needsMaintenance}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por outdoor, localização ou revisor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {uniqueMonths.map(month => (
                <SelectItem key={month} value={month}>
                  {format(new Date(month), 'MMMM yyyy', { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
            <SelectTrigger className="w-[200px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Revisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os revisores</SelectItem>
              {uniqueReviewers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="needs_maintenance">Precisa Manutenção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reviews Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Outdoor</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Revisor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map(review => {
                  const status = statusConfig[review.status] || statusConfig.approved;
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={review.id}>
                      <TableCell className="text-sm">
                        {format(new Date(review.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(review.review_month), 'MMM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{review.outdoor?.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {review.outdoor?.location}
                      </TableCell>
                      <TableCell className="text-sm">
                        {review.reviewer?.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReview(review)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredReviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma revisão encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog with Photo Comparison */}
        <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Revisão - {selectedReview?.outdoor?.code}</DialogTitle>
            </DialogHeader>
            
            {selectedReview && (
              <div className="space-y-6">
                {/* Info Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Data da Revisão</span>
                    <p className="font-medium">
                      {format(new Date(selectedReview.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Mês de Referência</span>
                    <p className="font-medium">
                      {format(new Date(selectedReview.review_month), 'MMMM yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Revisor</span>
                    <p className="font-medium">{selectedReview.reviewer?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={`${statusConfig[selectedReview.status]?.color || 'bg-gray-500'} text-white mt-1`}>
                      {statusConfig[selectedReview.status]?.label || selectedReview.status}
                    </Badge>
                  </div>
                </div>

                {/* Location Info */}
                <div>
                  <span className="text-sm text-muted-foreground">Localização</span>
                  <p className="font-medium">{selectedReview.outdoor?.location}</p>
                </div>

                {/* Photo Comparison */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Comparativo de Fotos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Foto do Cadastro</span>
                      {selectedReview.outdoor?.photo_url ? (
                        <img 
                          src={selectedReview.outdoor.photo_url} 
                          alt="Foto do cadastro" 
                          className="w-full h-64 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-muted-foreground">Sem foto de cadastro</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Foto da Revisão Atual</span>
                      {selectedReview.current_photo_url ? (
                        <img 
                          src={selectedReview.current_photo_url} 
                          alt="Foto da revisão" 
                          className="w-full h-64 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-muted-foreground">Sem foto da revisão</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observations */}
                {selectedReview.observations && (
                  <div>
                    <span className="text-sm text-muted-foreground">Observações</span>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{selectedReview.observations}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
