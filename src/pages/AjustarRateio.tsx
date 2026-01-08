import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Scale, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCustoExterno, useUpdateAlocacoes } from '@/hooks/useCustosExternos';
import { showToast } from '@/lib/toast';

interface RateioItem {
  posto_id: string;
  posto_name: string;
  posto_code: string;
  percentual: number;
  valor: number;
}

export function AjustarRateioContent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: custo, isLoading } = useCustoExterno(id);
  const updateAlocacoes = useUpdateAlocacoes();

  const [rateio, setRateio] = useState<RateioItem[]>([]);

  // Initialize rateio from custo data
  useEffect(() => {
    if (custo?.alocacoes) {
      const items: RateioItem[] = custo.alocacoes.map(a => ({
        posto_id: a.posto_id,
        posto_name: a.posto?.name || 'Posto',
        posto_code: a.posto?.code || '',
        percentual: Number(a.percentual_alocacao),
        valor: Number(a.valor_alocado),
      }));
      setRateio(items);
    }
  }, [custo]);

  const custoLiquido = custo 
    ? Number(custo.valor_total) - Number(custo.perda_valor || 0)
    : 0;

  const totalPercentual = rateio.reduce((sum, item) => sum + item.percentual, 0);

  const updatePercentual = (postoId: string, newPercentual: number) => {
    setRateio(prev => prev.map(item => {
      if (item.posto_id === postoId) {
        return {
          ...item,
          percentual: newPercentual,
          valor: (custoLiquido * newPercentual) / 100,
        };
      }
      return item;
    }));
  };

  const distribuirIgualmente = () => {
    const percentualIgual = 100 / rateio.length;
    setRateio(prev => prev.map(item => ({
      ...item,
      percentual: Number(percentualIgual.toFixed(2)),
      valor: (custoLiquido * percentualIgual) / 100,
    })));
  };

  const handleSave = () => {
    if (Math.abs(totalPercentual - 100) > 0.01) {
      showToast.error(`A soma deve ser 100% (atual: ${totalPercentual.toFixed(2)}%)`);
      return;
    }

    if (!id) return;

    updateAlocacoes.mutate({
      custoId: id,
      alocacoes: rateio.map(item => ({
        posto_id: item.posto_id,
        percentual_alocacao: item.percentual,
        valor_alocado: item.valor,
      })),
    }, {
      onSuccess: () => {
        navigate('/financeiro/custos');
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!custo) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Custo não encontrado</p>
          <Button variant="link" onClick={() => navigate('/custos-externos')}>
            Voltar para lista
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/custos-externos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ajustar Rateio do Custo</h1>
            <p className="text-muted-foreground">{custo.descricao}</p>
          </div>
        </div>

        {/* Cost Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold text-green-600">
                  R$ {custoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-muted-foreground">Custo líquido para rateio</p>
              </div>

              {custo.teve_perdas && (
                <div className="text-right">
                  <p className="text-sm text-red-600">
                    -R$ {Number(custo.perda_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (perdas)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Original: R$ {Number(custo.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rateio Editor */}
        <Card>
          <CardHeader className="bg-muted/50">
            <CardTitle>Distribuição por Posto</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajuste os percentuais manualmente (total deve ser 100%)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {rateio.map(item => (
                <div key={item.posto_id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.posto_name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.percentual}
                      onChange={(e) => updatePercentual(item.posto_id, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="px-6 py-4 border-t bg-muted/50">
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span className={totalPercentual === 100 ? 'text-green-600' : 'text-red-600'}>
                  {totalPercentual.toFixed(2)}%
                  {' '}
                  <span className="text-green-600">
                    (R$ {custoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={distribuirIgualmente}
          >
            <Scale className="h-4 w-4 mr-2" />
            Distribuir Igualmente
          </Button>

          <Button
            onClick={handleSave}
            disabled={Math.abs(totalPercentual - 100) > 0.01 || updateAlocacoes.isPending}
          >
            {updateAlocacoes.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Rateio
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
