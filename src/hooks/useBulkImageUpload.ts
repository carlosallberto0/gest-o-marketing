import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

interface ImageImportRecord {
  codigo_outdoor: string;
  foto_url: string;
  nome_posto?: string;
  linha: number;
}

interface ImageImportError {
  linha: number;
  codigo: string;
  erro: string;
}

interface ImageImportResult {
  total: number;
  sucessos: number;
  erros: ImageImportError[];
  modoTeste: boolean;
}

export function useBulkImageUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImageImportResult | null>(null);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const generateTemplate = (): string => {
    // Using semicolon for Brazilian Excel compatibility
    const header = 'nome_posto;codigo_outdoor;foto_url';
    const examples = [
      'Posto Centro;OUT-001;https://exemplo.com/foto1.jpg',
      'Posto Sul;OUT-002;https://exemplo.com/foto2.jpg',
      'Posto Norte;OUT-003;https://exemplo.com/foto3.jpg',
    ];
    return [header, ...examples].join('\n');
  };

  const downloadTemplate = () => {
    const content = generateTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_carga_imagens.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): ImageImportRecord[] => {
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    
    // Auto-detect delimiter: prefer semicolon (Brazilian) if present
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const delimiter = semicolonCount >= commaCount ? ';' : ',';

    // Parse and normalize headers
    const headers = headerLine.split(delimiter).map(h => 
      h.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/\s+/g, '_') // Replace spaces with underscores
    );

    // Find column indices with flexible matching
    const nomeColIndex = headers.findIndex(h => 
      h.includes('nome') || h.includes('posto') || h.includes('pdv')
    );
    
    const codeColIndex = headers.findIndex(h => 
      h.includes('codigo') || h.includes('code') || h.includes('outdoor')
    );
    
    const urlColIndex = headers.findIndex(h => 
      h.includes('foto') || h.includes('url') || h.includes('imagem') || h.includes('image')
    );

    if (codeColIndex === -1 || urlColIndex === -1) {
      console.warn('Colunas não encontradas automaticamente, tentando posições padrão');
      // Fallback to positional parsing if headers not recognized
    }

    const dataLines = lines.slice(1);
    const records: ImageImportRecord[] = [];

    dataLines.forEach((line, index) => {
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      let codigo_outdoor = '';
      let foto_url = '';
      let nome_posto: string | undefined;

      if (codeColIndex !== -1 && urlColIndex !== -1) {
        // Use detected column positions
        codigo_outdoor = parts[codeColIndex] || '';
        foto_url = parts[urlColIndex] || '';
        if (nomeColIndex !== -1) {
          nome_posto = parts[nomeColIndex] || undefined;
        }
      } else {
        // Fallback: try to detect by content patterns
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          // Outdoor code pattern: OUT-XXX
          if (/^OUT-\d+$/i.test(part)) {
            codigo_outdoor = part.toUpperCase();
          }
          // URL pattern
          else if (part.startsWith('http://') || part.startsWith('https://')) {
            foto_url = part;
          }
          // Otherwise might be PDV name (first non-code, non-url field)
          else if (!nome_posto && part.length > 0 && !codigo_outdoor) {
            nome_posto = part;
          }
        }
      }

      // Only add if we have valid required fields
      if (codigo_outdoor && foto_url) {
        records.push({
          codigo_outdoor: codigo_outdoor.toUpperCase(),
          foto_url,
          nome_posto,
          linha: index + 2, // +2 because header is line 1 and index is 0-based
        });
      }
    });

    return records;
  };

  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      // Basic URL validation
      new URL(url);
      
      // Check if URL is accessible (HEAD request)
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      // no-cors mode doesn't give us access to response details, but if it doesn't throw, it's likely valid
      return true;
    } catch {
      return false;
    }
  };

  const processImageUpdate = async (
    records: ImageImportRecord[],
    modoTeste: boolean,
    fileName: string
  ): Promise<ImageImportResult> => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    const errors: ImageImportError[] = [];
    let sucessos = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      setProgress(Math.round(((i + 1) / records.length) * 100));

      try {
        // Validate required fields
        if (!record.codigo_outdoor || !record.foto_url) {
          throw new Error('Código ou URL da foto ausentes');
        }

        // Find outdoor by code
        const { data: outdoor, error: findError } = await supabase
          .from('outdoors')
          .select('id, code')
          .eq('code', record.codigo_outdoor)
          .maybeSingle();

        if (findError) {
          throw new Error(`Erro ao buscar outdoor: ${findError.message}`);
        }

        if (!outdoor) {
          throw new Error(`Outdoor não encontrado: ${record.codigo_outdoor}`);
        }

        // Validate URL format
        try {
          new URL(record.foto_url);
        } catch {
          throw new Error('URL de imagem inválida');
        }

        // If not test mode, update the outdoor
        if (!modoTeste) {
          const { error: updateError } = await supabase
            .from('outdoors')
            .update({
              photo_url: record.foto_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', outdoor.id);

          if (updateError) {
            throw new Error(`Erro ao atualizar: ${updateError.message}`);
          }
        }

        sucessos++;
      } catch (error) {
        errors.push({
          linha: record.linha,
          codigo: record.codigo_outdoor || 'N/A',
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // Log the operation
    if (profile?.id) {
      await supabase.from('logs_carga_massa').insert([{
        usuario_id: profile.id,
        arquivo_nome: fileName,
        total_linhas: records.length,
        sucessos,
        erros: errors.length,
        detalhes_erros: JSON.parse(JSON.stringify(errors)) as Json,
        modo_teste: modoTeste,
      }]);
    }

    // Invalidate outdoors query to refresh data
    if (!modoTeste && sucessos > 0) {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
    }

    const importResult: ImageImportResult = {
      total: records.length,
      sucessos,
      erros: errors,
      modoTeste,
    };

    setResult(importResult);
    setIsProcessing(false);

    return importResult;
  };

  const exportErrorLog = (errors: ImageImportError[]) => {
    const header = 'linha,codigo_outdoor,erro';
    const rows = errors.map(e => `${e.linha},"${e.codigo}","${e.erro}"`);
    const content = [header, ...rows].join('\n');
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `erros_carga_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
  };

  return {
    isProcessing,
    progress,
    result,
    parseCSV,
    validateImageUrl,
    processImageUpdate,
    downloadTemplate,
    exportErrorLog,
    resetState,
  };
}
