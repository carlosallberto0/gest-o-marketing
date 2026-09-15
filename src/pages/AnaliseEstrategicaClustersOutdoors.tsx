import { ClustersPorTipo } from "@/components/analise-estrategica/ClustersPorTipo";

export default function AnaliseEstrategicaClustersOutdoors() {
  return (
    <ClustersPorTipo
      tipoPdv="POS"
      titulo="Clusters — Outdoor"
      descricao="Distribuição e pontuação dos PDVs de mídia externa por cluster."
    />
  );
}
