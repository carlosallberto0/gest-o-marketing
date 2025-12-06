import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceOrderPDFData {
  number: string;
  type: string;
  status: string;
  description: string;
  total_cost: number;
  created_at: string;
  approved_at?: string | null;
  completed_at?: string | null;
  outdoor?: {
    code: string;
    location: string;
    width: number;
    height: number;
    area: number | null;
    pdv?: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
  };
  supplier?: {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
  };
}

const typeLabels: Record<string, string> = {
  installation: 'Instalação',
  maintenance: 'Manutenção',
  removal: 'Remoção',
  replacement: 'Substituição',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export function generateServiceOrderPDF(order: ServiceOrderPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(order.number, pageWidth / 2, 30, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPos = 55;
  
  // Order Info Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DA ORDEM', 14, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Tipo de Serviço:', typeLabels[order.type] || order.type],
      ['Status:', statusLabels[order.status] || order.status],
      ['Data de Criação:', format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })],
      ['Data de Aprovação:', order.approved_at ? format(new Date(order.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'],
      ['Data de Conclusão:', order.completed_at ? format(new Date(order.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'],
      ['Valor Total:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_cost)],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Outdoor Info Section
  if (order.outdoor) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DO OUTDOOR', 14, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: [
        ['Código:', order.outdoor.code],
        ['Localização:', order.outdoor.location],
        ['Dimensões:', `${order.outdoor.width}m x ${order.outdoor.height}m (${order.outdoor.area || (order.outdoor.width * order.outdoor.height)}m²)`],
        ['PDV:', order.outdoor.pdv?.name || '-'],
        ['Endereço:', order.outdoor.pdv ? `${order.outdoor.pdv.address}, ${order.outdoor.pdv.city} - ${order.outdoor.pdv.state}` : '-'],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Supplier Info Section
  if (order.supplier) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DO FORNECEDOR', 14, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: [
        ['Fornecedor:', order.supplier.name],
        ['CNPJ:', order.supplier.cnpj],
        ['Telefone:', order.supplier.phone],
        ['E-mail:', order.supplier.email],
        ['Endereço:', order.supplier.address],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Description Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO DO SERVIÇO', 14, yPos);
  yPos += 8;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const descriptionLines = doc.splitTextToSize(order.description, pageWidth - 28);
  doc.text(descriptionLines, 14, yPos);
  
  yPos += descriptionLines.length * 5 + 20;
  
  // Signatures Section
  if (yPos > 230) {
    doc.addPage();
    yPos = 30;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURAS', 14, yPos);
  yPos += 15;
  
  // Signature lines
  const signatureWidth = 80;
  const signatureGap = 20;
  
  doc.setLineWidth(0.5);
  doc.line(14, yPos + 20, 14 + signatureWidth, yPos + 20);
  doc.line(14 + signatureWidth + signatureGap, yPos + 20, 14 + signatureWidth * 2 + signatureGap, yPos + 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Responsável pelo Serviço', 14 + signatureWidth / 2, yPos + 28, { align: 'center' });
  doc.text('Responsável pelo PDV', 14 + signatureWidth + signatureGap + signatureWidth / 2, yPos + 28, { align: 'center' });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount} | Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`OS-${order.number}.pdf`);
}

interface MerchReportPDFData {
  pdv: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  evaluator: string;
  date: string;
  percentageScore: number;
  categoryScores: Record<string, number>;
  answers: {
    category: string;
    question: string;
    value: string;
    observation?: string;
  }[];
  signatureUrl?: string;
}

export function generateMerchReportPDF(data: MerchReportPDFData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  const headerColor = data.percentageScore >= 85 
    ? [34, 197, 94] 
    : data.percentageScore >= 70 
      ? [234, 179, 8] 
      : [239, 68, 68];
  
  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE MERCHANDISING', pageWidth / 2, 16, { align: 'center' });
  
  doc.setFontSize(28);
  doc.text(`${data.percentageScore}%`, pageWidth / 2, 34, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  let yPos = 60;
  
  // PDV Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DO PDV', 14, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['PDV:', data.pdv.name],
      ['Endereço:', `${data.pdv.address}, ${data.pdv.city} - ${data.pdv.state}`],
      ['Avaliador:', data.evaluator],
      ['Data da Avaliação:', format(new Date(data.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Category Scores
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PONTUAÇÃO POR CATEGORIA', 14, yPos);
  yPos += 8;
  
  const categoryData = Object.entries(data.categoryScores).map(([cat, score]) => [
    cat,
    `${score}%`,
    score >= 85 ? '✓ Excelente' : score >= 70 ? '◐ Regular' : '✗ Crítico',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Categoria', 'Score', 'Status']],
    body: categoryData,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Detailed Answers (if fits on page)
  if (yPos < 200 && data.answers.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHAMENTO DAS RESPOSTAS', 14, yPos);
    yPos += 8;
    
    const answerData = data.answers.map(a => [
      a.category,
      a.question.substring(0, 50) + (a.question.length > 50 ? '...' : ''),
      a.value === 'yes' ? 'SIM' : a.value === 'no' ? 'NÃO' : 'N/A',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Categoria', 'Pergunta', 'Resposta']],
      body: answerData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount} | Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`relatorio-merch-${data.pdv.name.replace(/\s+/g, '-')}-${format(new Date(data.date), 'yyyy-MM-dd')}.pdf`);
}
