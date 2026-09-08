import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MapPDV } from '@/hooks/useStrategicMapData';
import { useBulkEditPDVs } from '@/hooks/useBulkEditPDVs';
import { useProfiles } from '@/hooks/useProfiles';
import { Loader2, Users, FileCheck, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdvs: MapPDV[];
  onSuccess?: () => void;
}

const NO_CHANGE_VALUE = 'no_change';

const IMPORT_STATUS_OPTIONS = [
  { value: NO_CHANGE_VALUE, label: 'Não alterar' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'pre_cadastrado', label: 'Pré-cadastrado' },
  { value: 'em_revisao', label: 'Em Revisão' },
];

const PDV_STATUS_OPTIONS = [
  { value: NO_CHANGE_VALUE, label: 'Não alterar' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
];

export function BulkEditDialog({ open, onOpenChange, pdvs, onSuccess }: BulkEditDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [managerId, setManagerId] = useState<string>(NO_CHANGE_VALUE);
  const [importStatus, setImportStatus] = useState<string>(NO_CHANGE_VALUE);
  const [pdvStatus, setPdvStatus] = useState<string>(NO_CHANGE_VALUE);

  const { mutate: bulkEdit, isPending } = useBulkEditPDVs();
  const { data: profiles } = useProfiles();

  // Filter only pre-registered PDVs for editing
  const editablePDVs = useMemo(() => {
    return pdvs.filter(p => p.status_importacao === 'pre_cadastrado' || p.status_importacao === 'em_revisao');
  }, [pdvs]);

  const managers = useMemo(() => {
    return profiles?.filter(p => 
      p.role === 'manager' || p.role === 'admin' || p.role === 'director'
    ) || [];
  }, [profiles]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(editablePDVs.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectPDV = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleApply = () => {
    if (selectedIds.size === 0) return;

    const updates: Record<string, string | null> = {};

    if (managerId !== NO_CHANGE_VALUE && managerId !== 'none') {
      updates.manager_id = managerId;
    } else if (managerId === 'none') {
      updates.manager_id = null;
    }

    if (importStatus !== NO_CHANGE_VALUE) {
      updates.status_importacao = importStatus;
    }

    if (pdvStatus !== NO_CHANGE_VALUE) {
      updates.status = pdvStatus;
    }

    if (Object.keys(updates).length === 0) return;

    bulkEdit(
      { pdvIds: Array.from(selectedIds), updates },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setManagerId(NO_CHANGE_VALUE);
          setImportStatus(NO_CHANGE_VALUE);
          setPdvStatus(NO_CHANGE_VALUE);
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleExport = () => {
    const dataToExport = (selectedIds.size > 0 
      ? editablePDVs.filter(p => selectedIds.has(p.id))
      : editablePDVs
    ).map(p => ({
      'Código': p.code,
      'Nome': p.name,
      'Cidade': p.city,
      'Estado': p.state,
      'Status': p.status,
      'Status Importação': p.status_importacao || 'N/A',
      'Gerente': p.managerName || 'Não atribuído',
      'Latitude': p.lat,
      'Longitude': p.lng,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDVs Pré-cadastrados');
    XLSX.writeFile(wb, `pdvs_pre_cadastrados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setManagerId(NO_CHANGE_VALUE);
    setImportStatus(NO_CHANGE_VALUE);
    setPdvStatus(NO_CHANGE_VALUE);
    onOpenChange(false);
  };

  const allSelected = editablePDVs.length > 0 && selectedIds.size === editablePDVs.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < editablePDVs.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edição em Lote de PDVs
          </DialogTitle>
          <DialogDescription>
            Selecione os PDVs pré-cadastrados para editar em lote. {editablePDVs.length} PDVs disponíveis para edição.
          </DialogDescription>
        </DialogHeader>

        {editablePDVs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum PDV pré-cadastrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Todos os PDVs já foram revisados e ativados.
            </p>
          </div>
        ) : (
          <>
            {/* Selection List */}
            <div className="border rounded-lg">
              <div className="flex items-center gap-3 p-3 border-b bg-muted/50">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement).dataset.state = someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
                  }}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Selecionar todos ({editablePDVs.length})
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {selectedIds.size} selecionados
                </Badge>
              </div>
              
              <ScrollArea className="h-[250px]">
                <div className="divide-y">
                  {editablePDVs.map((pdv) => (
                    <div key={pdv.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                      <Checkbox
                        checked={selectedIds.has(pdv.id)}
                        onCheckedChange={(checked) => handleSelectPDV(pdv.id, !!checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pdv.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pdv.code} • {pdv.city}, {pdv.state}
                        </p>
                      </div>
                      <Badge variant={pdv.status_importacao === 'pre_cadastrado' ? 'outline' : 'secondary'}>
                        {pdv.status_importacao || 'N/A'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Edit Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Gerente Responsável
                </Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Não alterar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CHANGE_VALUE}>Não alterar</SelectItem>
                    <SelectItem value="none">Remover gerente</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <FileCheck className="h-3 w-3" />
                  Status de Importação
                </Label>
                <Select value={importStatus} onValueChange={setImportStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Não alterar" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORT_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" />
                  Status do PDV
                </Label>
                <Select value={pdvStatus} onValueChange={setPdvStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Não alterar" />
                  </SelectTrigger>
                  <SelectContent>
                    {PDV_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleExport} disabled={editablePDVs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={
              selectedIds.size === 0 ||
              isPending ||
              (managerId === NO_CHANGE_VALUE && importStatus === NO_CHANGE_VALUE && pdvStatus === NO_CHANGE_VALUE)
            }
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
