import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ReportSettings } from '@/hooks/useReportSettings';

// Utility function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 59, g: 130, b: 246 }; // Fallback to blue
}

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

// =============== OUTDOOR LIST PDF ===============

export interface OutdoorPDFData {
  code: string;
  pdvName: string;
  city: string;
  photoUrl?: string;
  width: number;
  height: number;
  area: number;
  locationUrl?: string;
  location: string;
  status: string;
}

const outdoorStatusLabels: Record<string, string> = {
  operational: 'Operacional',
  non_operational: 'Não Operacional',
  pending_evaluation: 'Pendente',
};

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateOutdoorListPDF(
  outdoors: OutdoorPDFData[],
  settings?: ReportSettings
): Promise<void> {
  // Get settings with fallbacks
  const headerBgColor = hexToRgb(settings?.global?.header?.background_color || '#3b82f6');
  const headerTextColor = hexToRgb(settings?.global?.header?.text_color || '#ffffff');
  const bodyTableHeaderColor = hexToRgb(settings?.global?.body?.table_header_color || '#3b82f6');
  const bodyStripeColor = hexToRgb(settings?.global?.body?.table_stripe_color || '#f5f5f5');
  const footerTextColor = hexToRgb(settings?.global?.footer?.text_color || '#808080');
  
  const title = settings?.templates?.outdoors?.header_title || 
                settings?.global?.header?.title || 
                'RELAÇÃO DE OUTDOORS - MANUTENÇÃO';
  const showSubtitle = settings?.global?.header?.show_subtitle !== false;
  const showDate = settings?.global?.header?.show_date !== false;
  const showOnAllPages = settings?.global?.header?.show_on_all_pages || false;
  const logoUrl = settings?.global?.header?.logo_url;
  const logoPosition = settings?.global?.header?.logo_position || 'left';
  const logoHeight = settings?.global?.header?.logo_height || 15;
  const fontFamily = settings?.global?.font_family || 'helvetica';
  
  const marginLeft = settings?.global?.margins?.left || 14;
  const marginRight = settings?.global?.margins?.right || 14;
  const marginTop = settings?.global?.margins?.top || 20;
  const marginBottom = settings?.global?.margins?.bottom || 20;
  
  const doc = new jsPDF({
    orientation: settings?.global?.page_orientation || 'portrait',
    format: settings?.global?.page_format || 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Load logo if configured
  let logoBase64: string | null = null;
  if (logoUrl) {
    logoBase64 = await loadImageAsBase64(logoUrl);
  }
  
  // Function to draw header (used on first page or all pages if configured)
  const drawHeader = async (isFirstPage: boolean) => {
    if (!isFirstPage && !showOnAllPages) return 45; // Return default yPos for subsequent pages
    
    const headerHeight = 35;
    
    // Header background
    doc.setFillColor(headerBgColor.r, headerBgColor.g, headerBgColor.b);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Logo
    if (logoBase64) {
      const aspectRatio = 2; // Assume 2:1 aspect ratio for logo width calculation
      const logoWidth = logoHeight * aspectRatio;
      let logoX = marginLeft;
      
      if (logoPosition === 'center') {
        logoX = (pageWidth - logoWidth) / 2;
      } else if (logoPosition === 'right') {
        logoX = pageWidth - marginRight - logoWidth;
      }
      
      try {
        doc.addImage(logoBase64, 'PNG', logoX, 3, logoWidth, logoHeight);
      } catch (e) {
        console.error('Error adding logo:', e);
      }
    }
    
    // Title - adjust position based on logo
    doc.setTextColor(headerTextColor.r, headerTextColor.g, headerTextColor.b);
    doc.setFontSize(18);
    doc.setFont(fontFamily, 'bold');
    
    let titleY = logoBase64 ? logoHeight + 7 : 15;
    if (logoPosition === 'center' && logoBase64) {
      titleY = logoHeight + 10;
    }
    
    doc.text(title, pageWidth / 2, titleY, { align: 'center' });
    
    // Subtitle with count and date
    if (showSubtitle || showDate) {
      doc.setFontSize(11);
      doc.setFont(fontFamily, 'normal');
      
      let subtitleText = '';
      if (showSubtitle) {
        subtitleText += `${outdoors.length} outdoor(s)`;
      }
      if (showDate) {
        if (subtitleText) subtitleText += ' • ';
        subtitleText += `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
      }
      
      if (subtitleText) {
        const subtitleY = titleY + 11;
        doc.text(subtitleText, pageWidth / 2, subtitleY, { align: 'center' });
      }
    }
    
    return headerHeight + 10; // Return yPos after header
  };
  
  // Draw header on first page
  let yPos = await drawHeader(true);
  
  const itemHeight = 55;
  const imageWidth = 50;
  const imageHeight = 35;
  
  for (let i = 0; i < outdoors.length; i++) {
    const outdoor = outdoors[i];
    
    // Check if we need a new page
    if (yPos + itemHeight > pageHeight - marginBottom) {
      doc.addPage();
      // Draw header on new page if configured
      if (showOnAllPages) {
        yPos = await drawHeader(false);
      } else {
        yPos = marginTop;
      }
    }
    
    // Item number and code header - using body stripe color
    doc.setFillColor(bodyStripeColor.r, bodyStripeColor.g, bodyStripeColor.b);
    doc.rect(marginLeft, yPos, pageWidth - marginLeft - marginRight, 8, 'F');
    
    doc.setFontSize(10);
    doc.setFont(fontFamily, 'bold');
    doc.setTextColor(bodyTableHeaderColor.r, bodyTableHeaderColor.g, bodyTableHeaderColor.b);
    doc.text(`${i + 1}. ${outdoor.code}`, marginLeft + 2, yPos + 5.5);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont(fontFamily, 'normal');
    const truncatedPdv = outdoor.pdvName.length > 40 ? outdoor.pdvName.substring(0, 40) + '...' : outdoor.pdvName;
    doc.text(` - ${truncatedPdv}`, marginLeft + 2 + doc.getTextWidth(`${i + 1}. ${outdoor.code}`), yPos + 5.5);
    
    yPos += 12;
    
    // Image placeholder/image
    const imgX = marginLeft;
    const imgY = yPos;
    
    if (outdoor.photoUrl) {
      const base64 = await loadImageAsBase64(outdoor.photoUrl);
      if (base64) {
        try {
          doc.addImage(base64, 'JPEG', imgX, imgY, imageWidth, imageHeight);
        } catch {
          // Fallback to placeholder
          doc.setFillColor(230, 230, 230);
          doc.rect(imgX, imgY, imageWidth, imageHeight, 'F');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('[Sem imagem]', imgX + imageWidth / 2, imgY + imageHeight / 2, { align: 'center' });
        }
      } else {
        doc.setFillColor(230, 230, 230);
        doc.rect(imgX, imgY, imageWidth, imageHeight, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('[Sem imagem]', imgX + imageWidth / 2, imgY + imageHeight / 2, { align: 'center' });
      }
    } else {
      doc.setFillColor(230, 230, 230);
      doc.rect(imgX, imgY, imageWidth, imageHeight, 'F');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('[Sem imagem]', imgX + imageWidth / 2, imgY + imageHeight / 2, { align: 'center' });
    }
    
    // Info column
    const infoX = imgX + imageWidth + 8;
    let infoY = imgY + 4;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    // Size
    doc.setFont(fontFamily, 'bold');
    doc.text('Tamanho:', infoX, infoY);
    doc.setFont(fontFamily, 'normal');
    doc.text(`${outdoor.width}m x ${outdoor.height}m (${outdoor.area}m²)`, infoX + 22, infoY);
    infoY += 6;
    
    // City
    doc.setFont(fontFamily, 'bold');
    doc.text('Cidade:', infoX, infoY);
    doc.setFont(fontFamily, 'normal');
    doc.text(outdoor.city || 'Não informada', infoX + 17, infoY);
    infoY += 6;
    
    // Status
    doc.setFont(fontFamily, 'bold');
    doc.text('Status:', infoX, infoY);
    doc.setFont(fontFamily, 'normal');
    const statusText = outdoorStatusLabels[outdoor.status] || outdoor.status;
    doc.text(statusText, infoX + 15, infoY);
    infoY += 6;
    
    // Location
    doc.setFont(fontFamily, 'bold');
    doc.text('Localização:', infoX, infoY);
    doc.setFont(fontFamily, 'normal');
    if (outdoor.locationUrl) {
      const displayUrl = outdoor.locationUrl.length > 45 ? outdoor.locationUrl.substring(0, 45) + '...' : outdoor.locationUrl;
      doc.setTextColor(bodyTableHeaderColor.r, bodyTableHeaderColor.g, bodyTableHeaderColor.b);
      doc.text(displayUrl, infoX + 26, infoY);
      doc.setTextColor(0, 0, 0);
    } else if (outdoor.location) {
      const displayLocation = outdoor.location.length > 45 ? outdoor.location.substring(0, 45) + '...' : outdoor.location;
      doc.text(displayLocation, infoX + 26, infoY);
    } else {
      doc.text('Não informada', infoX + 26, infoY);
    }
    
    yPos += imageHeight + 8;
    
    // Separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
    yPos += 5;
  }
  
  // Footer on all pages - use footer settings
  const footerContent = settings?.global?.footer?.content || 
    'Página {{pagina}} de {{total_paginas}} | Gerado em {{data_geracao}}';
  const footerAlignment = settings?.global?.footer?.alignment || 'center';
  const showPageNumbers = settings?.global?.footer?.show_page_numbers !== false;
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(footerTextColor.r, footerTextColor.g, footerTextColor.b);
    
    // Replace footer variables
    let footerText = footerContent
      .replace('{{pagina}}', String(i))
      .replace('{{total_paginas}}', String(pageCount))
      .replace('{{data_geracao}}', format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
    
    if (!showPageNumbers) {
      footerText = footerText.replace(/Página \d+ de \d+\s*\|?\s*/g, '');
    }
    
    let footerX = pageWidth / 2;
    let footerAlign: 'left' | 'center' | 'right' = 'center';
    
    if (footerAlignment === 'left') {
      footerX = marginLeft;
      footerAlign = 'left';
    } else if (footerAlignment === 'right') {
      footerX = pageWidth - marginRight;
      footerAlign = 'right';
    }
    
    doc.text(footerText, footerX, pageHeight - 10, { align: footerAlign });
  }
  
  doc.save(`relacao-outdoors-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
