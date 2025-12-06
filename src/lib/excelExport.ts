import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  fileName: string
) {
  // Transform data to match column headers
  const exportData = data.map(row => {
    const exportRow: Record<string, any> = {};
    columns.forEach(col => {
      exportRow[col.header] = row[col.key];
    });
    return exportRow;
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');

  // Generate file and download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// Pre-configured export functions for common entities
export function exportEvaluationsToExcel(evaluations: any[]) {
  const columns: ExportColumn[] = [
    { header: 'PDV', key: 'pdv_name', width: 25 },
    { header: 'Data', key: 'date', width: 15 },
    { header: 'Avaliador', key: 'evaluator_name', width: 20 },
    { header: 'Score (%)', key: 'score', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Pontos', key: 'points', width: 15 },
  ];

  const data = evaluations.map(e => ({
    pdv_name: e.pdv?.name || 'N/A',
    date: new Date(e.evaluation_date).toLocaleDateString('pt-BR'),
    evaluator_name: e.evaluator?.name || 'N/A',
    score: e.percentage_score,
    status: e.status === 'completed' ? 'Concluída' : 'Rascunho',
    points: `${e.total_score}/${e.total_possible_points}`,
  }));

  exportToExcel(data, columns, `avaliacoes_${new Date().toISOString().split('T')[0]}`);
}

export function exportPDVsToExcel(pdvs: any[]) {
  const columns: ExportColumn[] = [
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Tipo', key: 'type', width: 15 },
    { header: 'Cidade', key: 'city', width: 20 },
    { header: 'Estado', key: 'state', width: 10 },
    { header: 'Endereço', key: 'address', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const data = pdvs.map(p => ({
    code: p.code,
    name: p.name,
    type: p.type === 'posto' ? 'Posto' : p.type === 'conveniencia' ? 'Conveniência' : 'Ambos',
    city: p.city,
    state: p.state,
    address: p.address,
    status: p.status === 'active' ? 'Ativo' : 'Inativo',
  }));

  exportToExcel(data, columns, `pdvs_${new Date().toISOString().split('T')[0]}`);
}

export function exportOutdoorsToExcel(outdoors: any[]) {
  const columns: ExportColumn[] = [
    { header: 'Código', key: 'code', width: 12 },
    { header: 'PDV', key: 'pdv_name', width: 25 },
    { header: 'Localização', key: 'location', width: 30 },
    { header: 'Dimensões', key: 'dimensions', width: 15 },
    { header: 'Área (m²)', key: 'area', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Tipo', key: 'ownership', width: 12 },
  ];

  const data = outdoors.map(o => ({
    code: o.code,
    pdv_name: o.pdv?.name || 'N/A',
    location: o.location,
    dimensions: `${o.width}m x ${o.height}m`,
    area: o.area || (o.width * o.height).toFixed(2),
    status: o.status === 'operational' ? 'Operacional' : o.status === 'non_operational' ? 'Não Operacional' : 'Pendente',
    ownership: o.ownership_type === 'owned' ? 'Próprio' : 'Alugado',
  }));

  exportToExcel(data, columns, `outdoors_${new Date().toISOString().split('T')[0]}`);
}

export function exportContractsToExcel(contracts: any[]) {
  const columns: ExportColumn[] = [
    { header: 'Fazendeiro', key: 'farmer_name', width: 25 },
    { header: 'CPF', key: 'farmer_cpf', width: 15 },
    { header: 'Outdoor', key: 'outdoor_code', width: 15 },
    { header: 'Início', key: 'start_date', width: 12 },
    { header: 'Fim', key: 'end_date', width: 12 },
    { header: 'Valor Mensal', key: 'monthly_value', width: 15 },
    { header: 'Valor Anual', key: 'annual_value', width: 15 },
    { header: 'Pagamento', key: 'payment_method', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  const data = contracts.map(c => ({
    farmer_name: c.farmer_name,
    farmer_cpf: c.farmer_cpf,
    outdoor_code: c.outdoor?.code || 'N/A',
    start_date: new Date(c.start_date).toLocaleDateString('pt-BR'),
    end_date: new Date(c.end_date).toLocaleDateString('pt-BR'),
    monthly_value: `R$ ${Number(c.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    annual_value: `R$ ${Number(c.annual_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    payment_method: c.payment_method === 'cash' ? 'Dinheiro' : c.payment_method === 'fuel' ? 'Combustível' : 'Ambos',
    status: c.status === 'active' ? 'Ativo' : 'Inativo',
  }));

  exportToExcel(data, columns, `contratos_${new Date().toISOString().split('T')[0]}`);
}

export function exportAuditLogsToExcel(logs: any[]) {
  const columns: ExportColumn[] = [
    { header: 'Data/Hora', key: 'datetime', width: 20 },
    { header: 'Usuário', key: 'user_name', width: 25 },
    { header: 'Ação', key: 'action', width: 20 },
    { header: 'Entidade', key: 'entity_type', width: 15 },
    { header: 'ID Entidade', key: 'entity_id', width: 36 },
  ];

  const data = logs.map(l => ({
    datetime: new Date(l.created_at).toLocaleString('pt-BR'),
    user_name: l.user?.name || 'Sistema',
    action: l.action,
    entity_type: l.entity_type,
    entity_id: l.entity_id || 'N/A',
  }));

  exportToExcel(data, columns, `auditoria_${new Date().toISOString().split('T')[0]}`);
}
