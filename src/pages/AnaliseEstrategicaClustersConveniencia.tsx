import { ClustersPorTipo } from "@/components/analise-estrategica/ClustersPorTipo";

export default function AnaliseEstrategicaClustersConveniencia() {
  return (
    <ClustersPorTipo
      tipoPdv="CONV"
      titulo="Clusters — Conveniência"
      descricao="Distribuição e pontuação dos PDVs de conveniência por cluster."
    />
  );
}
