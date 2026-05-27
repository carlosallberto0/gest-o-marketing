import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Share2 } from 'lucide-react';
import { usePublicNetwork, PublicPdv } from '@/hooks/usePublicNetwork';
import { NetworkKPIs } from './components/NetworkKPIs';
import { NetworkFilters } from './components/NetworkFilters';
import { NetworkGrid } from './components/NetworkGrid';
import { NetworkTable } from './components/NetworkTable';
import { PdvDetailDialog } from './components/PdvDetailDialog';
import { ShareDialog } from './components/ShareDialog';

export default function PublicNetworkPortal() {
  const { data, isLoading } = usePublicNetwork();
  const [search, setSearch] = useState('');
  const [bandeira, setBandeira] = useState('');
  const [estado, setEstado] = useState('');
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [selected, setSelected] = useState<PublicPdv | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const pdvs = data?.pdvs || [];
  const servicos = data?.servicos || [];

  const bandeiras = useMemo(
    () => Array.from(new Set(pdvs.map((p) => p.bandeira).filter(Boolean) as string[])).sort(),
    [pdvs]
  );
  const estados = useMemo(
    () => Array.from(new Set(pdvs.map((p) => p.state).filter(Boolean) as string[])).sort(),
    [pdvs]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return pdvs.filter((p) => {
      if (bandeira && p.bandeira !== bandeira) return false;
      if (estado && p.state !== estado) return false;
      if (selectedServicos.length > 0 && !selectedServicos.every((k) => p.servicos.includes(k))) return false;
      if (q) {
        const hay = `${p.name} ${p.code} ${p.city} ${p.state} ${p.bandeira || ''} ${p.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [pdvs, search, bandeira, estado, selectedServicos]);

  const kpis = useMemo(() => ({
    total: pdvs.length,
    bandeiras: bandeiras.length,
    withConveniencia: pdvs.filter((p) => p.servicos.includes('conveniencia')).length,
    withLavaJato: pdvs.filter((p) => p.servicos.includes('lava_jato')).length,
  }), [pdvs, bandeiras]);

  const toggleServico = (k: string) => {
    setSelectedServicos((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Rede de Postos — Gestão & Marketing</title>
        <meta name="description" content={`Conheça a rede de postos: ${pdvs.length} unidades em ${estados.length} estados, com serviços de conveniência, lava jato, troca de óleo e mais.`} />
        <meta property="og:title" content="Rede de Postos" />
        <meta property="og:description" content={`${pdvs.length} postos disponíveis na rede.`} />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Rede de Postos</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Carregando…' : `${pdvs.length} postos cadastrados`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" /> Compartilhar
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <NetworkKPIs {...kpis} />
            <NetworkFilters
              search={search}
              onSearch={setSearch}
              bandeira={bandeira}
              onBandeira={setBandeira}
              bandeiras={bandeiras}
              estado={estado}
              onEstado={setEstado}
              estados={estados}
              selectedServicos={selectedServicos}
              onToggleServico={toggleServico}
              servicos={servicos}
              view={view}
              onView={setView}
            />
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                Nenhum posto encontrado. Ajuste os filtros.
              </div>
            ) : view === 'grid' ? (
              <NetworkGrid pdvs={filtered} servicos={servicos} onSelect={setSelected} />
            ) : (
              <NetworkTable pdvs={filtered} onSelect={setSelected} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card py-4">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Gestão & Marketing
        </p>
      </footer>

      <PdvDetailDialog pdv={selected} servicos={servicos} onClose={() => setSelected(null)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} pdvs={filtered} servicos={servicos} />
    </div>
  );
}
