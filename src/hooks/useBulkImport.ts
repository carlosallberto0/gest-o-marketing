import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { extractCoordsFromGoogleMapsUrl, isShortGoogleMapsUrl } from '@/lib/googleMaps';

export interface ImportRecord {
  tipo: 'posto' | 'outdoor';
  link_url: string;
  latitude?: number;
  longitude?: number;
  posto_referencia?: string;
  nome?: string;
  status_sugerido?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  largura?: number;
  altura?: number;
}

export interface ImportResult {
  sucesso: boolean;
  tipo: string;
  nome: string;
  linha: number;
  erro?: string;
}

export interface ImportSummary {
  total_postos: number;
  total_outdoors: number;
  postos_criados: number;
  outdoors_criados: number;
  erros: ImportResult[];
}

interface ParsedData {
  records: ImportRecord[];
  summary: {
    total_postos: number;
    total_outdoors: number;
  };
}

// Generate CSV template
export function generateCSVTemplate(): string {
  const headers = [
    'tipo',
    'link_url',
    'posto_referencia',
    'nome',
    'endereco',
    'cidade',
    'estado',
    'largura',
    'altura'
  ];
  
  const examplePosto = [
    'posto',
    'https://maps.app.goo.gl/ABC123',
    '',
    'Posto Shell Centro',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '',
    ''
  ];
  
  const exampleOutdoor = [
    'outdoor',
    'https://maps.app.goo.gl/XYZ789',
    'Posto Shell Centro',
    '',
    '',
    '',
    '',
    '3',
    '2'
  ];
  
  return [
    headers.join(','),
    examplePosto.join(','),
    exampleOutdoor.join(',')
  ].join('\n');
}

// Robust CSV parser that handles quoted values with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Remove BOM and normalize line endings
function normalizeContent(content: string): string {
  // Remove UTF-8 BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  // Normalize line endings
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function useBulkImport() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const parseCSV = useCallback((content: string): ParsedData => {
    const normalizedContent = normalizeContent(content);
    const lines = normalizedContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Validate required headers - now just tipo and link_url (or url alias)
    const hasLinkUrl = headers.includes('link_url') || headers.includes('url');
    if (!headers.includes('tipo')) {
      throw new Error('Coluna obrigatória ausente: tipo');
    }
    if (!hasLinkUrl) {
      throw new Error('Coluna obrigatória ausente: link_url (ou url)');
    }
    
    const records: ImportRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue; // Skip empty lines and comments
      
      const values = parseCSVLine(line);
      const record: any = {};
      
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });
      
      // Validate and parse
      const tipo = record.tipo?.toLowerCase().trim();
      if (!tipo || (tipo !== 'posto' && tipo !== 'outdoor')) {
        continue; // Skip invalid types
      }
      
      // Get link_url from either column name
      const linkUrl = record.link_url?.trim() || record.url?.trim();
      
      if (!linkUrl) {
        continue; // Skip records without URL
      }
      
      records.push({
        tipo: tipo as 'posto' | 'outdoor',
        link_url: linkUrl,
        nome: record.nome?.trim() || undefined,
        posto_referencia: record.posto_referencia?.trim(),
        status_sugerido: record.status_sugerido?.trim() || 'pre_cadastrado',
        endereco: record.endereco?.trim(),
        cidade: record.cidade?.trim(),
        estado: record.estado?.trim(),
        largura: record.largura ? parseFloat(record.largura) : undefined,
        altura: record.altura ? parseFloat(record.altura) : undefined,
      });
    }
    
    const postos = records.filter(r => r.tipo === 'posto');
    const outdoors = records.filter(r => r.tipo === 'outdoor');
    
    return {
      records,
      summary: {
        total_postos: postos.length,
        total_outdoors: outdoors.length
      }
    };
  }, []);

  const parseJSON = useCallback((content: string): ParsedData => {
    const data = JSON.parse(content);
    const records: ImportRecord[] = [];
    
    // Handle nested structure
    if (data.registros) {
      for (const registro of data.registros) {
        records.push({
          tipo: registro.tipo as 'posto' | 'outdoor',
          link_url: registro.link_url || registro.url || registro.fonte_url,
          nome: registro.nome,
          status_sugerido: registro.status_sugerido || 'pre_cadastrado',
          endereco: registro.endereco,
          cidade: registro.cidade,
          estado: registro.estado,
        });
        
        // Handle nested outdoors
        if (registro.outdoors_associados) {
          for (const outdoor of registro.outdoors_associados) {
            records.push({
              tipo: 'outdoor',
              link_url: outdoor.link_url || outdoor.url,
              nome: outdoor.nome,
              posto_referencia: registro.nome,
              status_sugerido: outdoor.status_sugerido || 'pre_cadastrado',
              largura: outdoor.largura,
              altura: outdoor.altura,
            });
          }
        }
      }
    } else if (Array.isArray(data)) {
      // Handle flat array structure
      for (const item of data) {
        records.push({
          tipo: item.tipo as 'posto' | 'outdoor',
          link_url: item.link_url || item.url || item.fonte_url,
          nome: item.nome,
          posto_referencia: item.posto_referencia,
          status_sugerido: item.status_sugerido || 'pre_cadastrado',
          endereco: item.endereco,
          cidade: item.cidade,
          estado: item.estado,
          largura: item.largura,
          altura: item.altura,
        });
      }
    }
    
    const postos = records.filter(r => r.tipo === 'posto');
    const outdoors = records.filter(r => r.tipo === 'outdoor');
    
    return {
      records,
      summary: {
        total_postos: postos.length,
        total_outdoors: outdoors.length
      }
    };
  }, []);

  const parseFile = useCallback(async (file: File): Promise<ParsedData> => {
    const content = await file.text();
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (extension === 'csv') {
      return parseCSV(content);
    } else if (extension === 'json') {
      return parseJSON(content);
    }
    
    throw new Error('Formato de arquivo não suportado. Use CSV ou JSON.');
  }, [parseCSV, parseJSON]);

  const validateRecords = useCallback((records: ImportRecord[]): { errors: string[]; lineErrors: Map<number, string[]> } => {
    const errors: string[] = [];
    const lineErrors = new Map<number, string[]>();
    
    records.forEach((record, idx) => {
      const lineNum = idx + 2; // +2 because of header and 0-indexing
      const recordErrors: string[] = [];
      
      // Validate tipo
      if (!record.tipo || !['posto', 'outdoor'].includes(record.tipo)) {
        recordErrors.push(`TIPO inválido (deve ser "posto" ou "outdoor")`);
      }
      
      // Validate link_url
      if (!record.link_url) {
        recordErrors.push(`LINK_URL é obrigatório`);
      }
      
      // Validate outdoor reference
      if (record.tipo === 'outdoor' && !record.posto_referencia) {
        recordErrors.push(`POSTO_REFERENCIA obrigatória para outdoor`);
      }
      
      if (recordErrors.length > 0) {
        lineErrors.set(lineNum, recordErrors);
        errors.push(`Linha ${lineNum}: ${recordErrors.join('; ')}`);
      }
    });
    
    return { errors, lineErrors };
  }, []);

  // Resolve coordinates from URL (local or via backend)
  const resolveCoordinates = async (linkUrl: string): Promise<{ lat: number; lng: number } | null> => {
    // First try local extraction
    const localCoords = extractCoordsFromGoogleMapsUrl(linkUrl);
    if (localCoords) {
      return localCoords;
    }
    
    // If it's a short URL, call backend to resolve
    if (isShortGoogleMapsUrl(linkUrl)) {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-google-maps-url', {
          body: { url: linkUrl }
        });
        
        if (!error && data?.coords) {
          return data.coords;
        }
      } catch (e) {
        console.error('Error resolving URL:', e);
      }
    }
    
    return null;
  };

  const processImport = useCallback(async (
    records: ImportRecord[],
    options: {
      updateExisting: boolean;
      ignoreDuplicates: boolean;
      defaultStatus: string;
    }
  ): Promise<ImportSummary> => {
    setIsProcessing(true);
    setProgress(0);
    
    const results: ImportResult[] = [];
    const postoCache: Record<string, string> = {};
    let postosCreated = 0;
    let outdoorsCreated = 0;
    
    // First, process all postos
    const postos = records.filter(r => r.tipo === 'posto');
    const outdoors = records.filter(r => r.tipo === 'outdoor');
    const total = postos.length + outdoors.length;
    let processed = 0;

    // Create import lote record
    const { data: lote } = await supabase
      .from('import_lotes')
      .insert({
        arquivo_nome: 'bulk_import',
        quantidade_postos: postos.length,
        quantidade_outdoors: outdoors.length,
        status: 'processando',
        usuario_id: user?.id
      })
      .select()
      .single();

    try {
      // Process postos first - resolve coordinates from URLs
      for (let i = 0; i < postos.length; i++) {
        const posto = postos[i];
        const lineNum = records.indexOf(posto) + 2;
        const displayName = posto.nome || `Posto linha ${lineNum}`;
        
        try {
          // Resolve coordinates from URL
          const coords = await resolveCoordinates(posto.link_url);
          if (!coords) {
            throw new Error(`Não foi possível extrair coordenadas da URL: ${posto.link_url}`);
          }
          
          posto.latitude = coords.lat;
          posto.longitude = coords.lng;
          
          // Check if posto already exists
          let existingPosto = null;
          if ((options.updateExisting || options.ignoreDuplicates) && posto.nome) {
            const { data } = await supabase
              .from('pdvs')
              .select('id')
              .ilike('name', posto.nome)
              .maybeSingle();
            existingPosto = data;
          }
          
          if (existingPosto && options.ignoreDuplicates) {
            postoCache[(posto.nome || '').toLowerCase()] = existingPosto.id;
            results.push({ sucesso: true, tipo: 'posto', nome: displayName, linha: lineNum });
          } else if (existingPosto && options.updateExisting) {
            // Update existing
            await supabase
              .from('pdvs')
              .update({
                lat: posto.latitude,
                lng: posto.longitude,
                address: posto.endereco || undefined,
                city: posto.cidade || undefined,
                state: posto.estado || undefined,
                fonte_importacao: 'csv_json_massivo',
                status_importacao: options.defaultStatus
              })
              .eq('id', existingPosto.id);
            
            postoCache[(posto.nome || '').toLowerCase()] = existingPosto.id;
            postosCreated++;
            results.push({ sucesso: true, tipo: 'posto', nome: displayName, linha: lineNum });
          } else if (!existingPosto) {
            // Create new
            const code = `PDV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const postoName = posto.nome || `Posto ${code}`;
            const { data: newPdv, error } = await supabase
              .from('pdvs')
              .insert({
                name: postoName,
                code,
                address: posto.endereco || 'Endereço a confirmar',
                city: posto.cidade || 'A confirmar',
                state: posto.estado || 'SP',
                type: 'posto',
                lat: posto.latitude,
                lng: posto.longitude,
                fonte_importacao: 'csv_json_massivo',
                id_importacao: `${postoName}-${posto.latitude}-${posto.longitude}`,
                status_importacao: options.defaultStatus,
                active_modules: ['media']
              })
              .select()
              .single();
            
            if (error) throw error;
            
            postoCache[postoName.toLowerCase()] = newPdv.id;
            postosCreated++;
            results.push({ sucesso: true, tipo: 'posto', nome: postoName, linha: lineNum });
          } else {
            results.push({ sucesso: true, tipo: 'posto', nome: displayName, linha: lineNum });
          }
        } catch (error: any) {
          results.push({ 
            sucesso: false, 
            tipo: 'posto', 
            nome: displayName,
            linha: lineNum,
            erro: error.message 
          });
        }
        
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Now process outdoors
      for (let i = 0; i < outdoors.length; i++) {
        const outdoor = outdoors[i];
        const lineNum = records.indexOf(outdoor) + 2;
        
        try {
          // Resolve coordinates from URL
          const coords = await resolveCoordinates(outdoor.link_url);
          if (!coords) {
            throw new Error(`Não foi possível extrair coordenadas da URL: ${outdoor.link_url}`);
          }
          
          outdoor.latitude = coords.lat;
          outdoor.longitude = coords.lng;
          
          // Find the referenced posto
          let postoId = postoCache[outdoor.posto_referencia?.toLowerCase() || ''];
          
          if (!postoId && outdoor.posto_referencia) {
            // Try to find by exact or partial match
            const { data } = await supabase
              .from('pdvs')
              .select('id')
              .ilike('name', `%${outdoor.posto_referencia}%`)
              .maybeSingle();
            
            if (data) {
              postoId = data.id;
              postoCache[outdoor.posto_referencia.toLowerCase()] = data.id;
            }
          }
          
          if (!postoId) {
            throw new Error(`Posto de referência não encontrado: "${outdoor.posto_referencia}"`);
          }
          
          // Generate code for outdoor
          const code = `OUT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          const outdoorLocation = outdoor.nome || `Outdoor ${code}`;
          
          // Check for existing outdoor
          if (options.ignoreDuplicates) {
            const { data: existing } = await supabase
              .from('outdoors')
              .select('id')
              .eq('pdv_id', postoId)
              .ilike('location', outdoorLocation)
              .maybeSingle();
            
            if (existing) {
              results.push({ sucesso: true, tipo: 'outdoor', nome: code, linha: lineNum });
              processed++;
              setProgress(Math.round((processed / total) * 100));
              continue;
            }
          }
          
          const { error } = await supabase
            .from('outdoors')
            .insert({
              code,
              location: outdoorLocation,
              pdv_id: postoId,
              lat: outdoor.latitude,
              lng: outdoor.longitude,
              width: outdoor.largura || 3,
              height: outdoor.altura || 2,
              status: 'pending_evaluation',
              fonte_importacao: 'csv_json_massivo',
              id_importacao: `${code}-${outdoor.latitude}-${outdoor.longitude}`,
              status_importacao: options.defaultStatus
            });
          
          if (error) throw error;
          
          outdoorsCreated++;
          results.push({ sucesso: true, tipo: 'outdoor', nome: code, linha: lineNum });
        } catch (error: any) {
          results.push({ 
            sucesso: false, 
            tipo: 'outdoor', 
            nome: outdoor.nome || `Outdoor linha ${lineNum}`,
            linha: lineNum,
            erro: error.message 
          });
        }
        
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Update lote status
      const erros = results.filter(r => !r.sucesso);
      await supabase
        .from('import_lotes')
        .update({
          status: erros.length > 0 ? 'com_erros' : 'concluido',
          erros: erros as any,
          quantidade_postos: postosCreated,
          quantidade_outdoors: outdoorsCreated
        })
        .eq('id', lote?.id);

    } catch (error: any) {
      toast.error('Erro durante a importação: ' + error.message);
    }
    
    const finalSummary: ImportSummary = {
      total_postos: postos.length,
      total_outdoors: outdoors.length,
      postos_criados: postosCreated,
      outdoors_criados: outdoorsCreated,
      erros: results.filter(r => !r.sucesso)
    };
    
    setSummary(finalSummary);
    setIsProcessing(false);
    return finalSummary;
  }, [user]);

  const exportErrorLog = useCallback((errors: ImportResult[]) => {
    const csv = ['linha,tipo,nome,erro'];
    errors.forEach(e => {
      csv.push(`${e.linha},"${e.tipo}","${e.nome}","${e.erro || ''}"`);
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erros_importacao_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    parseFile,
    validateRecords,
    processImport,
    exportErrorLog,
    generateCSVTemplate,
    isProcessing,
    progress,
    summary,
    setSummary
  };
}
