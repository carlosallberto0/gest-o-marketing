import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, MapPin, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRegionalCosts, useUpdateRegionalCost, RegionalCost } from '@/hooks/useOperationalCosts';
import { Badge } from '@/components/ui/badge';

export function RegionalMultiplierSettings() {
  const { data: costs = [], isLoading } = useRegionalCosts();
  const updateCost = useUpdateRegionalCost();
  const [editingState, setEditingState] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(1.0);
  const [editObs, setEditObs] = useState<string>('');

  const handleEdit = (cost: RegionalCost) => {
    setEditingState(cost.estado);
    setEditValue(cost.multiplicador);
    setEditObs(cost.observacao || '');
  };

  const handleCancel = () => {
    setEditingState(null);
    setEditValue(1.0);
    setEditObs('');
  };

  const handleSave = async (estado: string) => {
    try {
      await updateCost.mutateAsync({
        estado,
        multiplicador: editValue,
        observacao: editObs,
      });
      setEditingState(null);
      toast.success(`Multiplicador de ${estado} atualizado!`);
    } catch (error) {
      console.error('Error updating regional cost:', error);
    }
  };

  const getMultiplierBadge = (mult: number) => {
    if (mult > 1.15) return <Badge variant="destructive">{mult.toFixed(2)}x</Badge>;
    if (mult > 1.05) return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">{mult.toFixed(2)}x</Badge>;
    if (mult < 0.95) return <Badge variant="secondary" className="bg-green-500/20 text-green-700">{mult.toFixed(2)}x</Badge>;
    return <Badge variant="outline">{mult.toFixed(2)}x</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group by region
  const regioes = {
    'Norte': ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
    'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'Centro-Oeste': ['DF', 'GO', 'MS', 'MT'],
    'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'Sul': ['PR', 'RS', 'SC'],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Multiplicadores Regionais
        </CardTitle>
        <CardDescription>
          Configure multiplicadores de custo por estado. Valores {'>'}1.0 aumentam o custo, {'<'}1.0 reduzem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Estado</TableHead>
                <TableHead className="w-32">Multiplicador</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(regioes).map(([regiao, estados]) => (
                <>
                  <TableRow key={regiao} className="bg-muted/30">
                    <TableCell colSpan={4} className="font-medium text-muted-foreground">
                      {regiao}
                    </TableCell>
                  </TableRow>
                  {estados.map(estado => {
                    const cost = costs.find(c => c.estado === estado);
                    if (!cost) return null;
                    
                    const isEditing = editingState === estado;
                    
                    return (
                      <TableRow key={estado}>
                        <TableCell className="font-medium">{estado}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0.5"
                              max="2.0"
                              value={editValue}
                              onChange={(e) => setEditValue(parseFloat(e.target.value) || 1.0)}
                              className="w-24 h-8"
                            />
                          ) : (
                            getMultiplierBadge(cost.multiplicador)
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editObs}
                              onChange={(e) => setEditObs(e.target.value)}
                              className="h-8"
                              placeholder="Observação..."
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {cost.observacao || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleSave(estado)}
                                disabled={updateCost.isPending}
                              >
                                {updateCost.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={handleCancel}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEdit(cost)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
