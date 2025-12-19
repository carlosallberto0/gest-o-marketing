import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ImportRecord {
  tipo: 'posto' | 'outdoor';
  nome: string;
  latitude: number;
  longitude: number;
  fonte_url?: string;
  posto_referencia?: string;
  status_sugerido?: string;
}

export interface ImportResult {
  sucesso: boolean;
  tipo: string;
  nome: string;
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

export function useBulkImport() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const parseCSV = useCallback((content: string): ParsedData => {
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const records: ImportRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, idx) => {
        record[header] = values[idx];
      });
      
      if (record.tipo && record.nome && record.latitude && record.longitude) {
        records.push({
          tipo: record.tipo.toLowerCase() as 'posto' | 'outdoor',
          nome: record.nome,
          latitude: parseFloat(record.latitude),
          longitude: parseFloat(record.longitude),
          fonte_url: record.fonte_url || record.url,
          posto_referencia: record.posto_referencia,
          status_sugerido: record.status_sugerido || 'pre_cadastrado'
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

  const parseJSON = useCallback((content: string): ParsedData => {
    const data = JSON.parse(content);
    const records: ImportRecord[] = [];
    
    // Handle nested structure
    if (data.registros) {
      for (const registro of data.registros) {
        records.push({
          tipo: registro.tipo as 'posto' | 'outdoor',
          nome: registro.nome,
          latitude: registro.latitude,
          longitude: registro.longitude,
          fonte_url: registro.fonte_url,
          status_sugerido: registro.status_sugerido || 'pre_cadastrado'
        });
        
        // Handle nested outdoors
        if (registro.outdoors_associados) {
          for (const outdoor of registro.outdoors_associados) {
            records.push({
              tipo: 'outdoor',
              nome: outdoor.nome,
              latitude: outdoor.latitude,
              longitude: outdoor.longitude,
              posto_referencia: registro.nome,
              status_sugerido: outdoor.status_sugerido || 'pre_cadastrado'
            });
          }
        }
      }
    } else if (Array.isArray(data)) {
      // Handle flat array structure
      for (const item of data) {
        records.push({
          tipo: item.tipo as 'posto' | 'outdoor',
          nome: item.nome,
          latitude: item.latitude,
          longitude: item.longitude,
          fonte_url: item.fonte_url,
          posto_referencia: item.posto_referencia,
          status_sugerido: item.status_sugerido || 'pre_cadastrado'
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

  const validateRecords = useCallback((records: ImportRecord[]): string[] => {
    const errors: string[] = [];
    
    records.forEach((record, idx) => {
      if (!record.nome) {
        errors.push(`Linha ${idx + 1}: Nome é obrigatório`);
      }
      if (isNaN(record.latitude) || record.latitude < -90 || record.latitude > 90) {
        errors.push(`Linha ${idx + 1}: Latitude inválida (${record.latitude})`);
      }
      if (isNaN(record.longitude) || record.longitude < -180 || record.longitude > 180) {
        errors.push(`Linha ${idx + 1}: Longitude inválida (${record.longitude})`);
      }
      if (record.tipo === 'outdoor' && !record.posto_referencia) {
        errors.push(`Linha ${idx + 1}: Outdoor "${record.nome}" não tem posto de referência`);
      }
    });
    
    return errors;
  }, []);

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
      // Process postos first
      for (const posto of postos) {
        try {
          // Check if posto already exists
          let existingPosto = null;
          if (options.updateExisting) {
            const { data } = await supabase
              .from('pdvs')
              .select('id')
              .ilike('name', `%${posto.nome}%`)
              .maybeSingle();
            existingPosto = data;
          }
          
          if (existingPosto && options.ignoreDuplicates) {
            postoCache[posto.nome] = existingPosto.id;
            results.push({ sucesso: true, tipo: 'posto', nome: posto.nome });
          } else if (existingPosto && options.updateExisting) {
            // Update existing
            await supabase
              .from('pdvs')
              .update({
                lat: posto.latitude,
                lng: posto.longitude,
                fonte_importacao: 'csv_json_massivo',
                status_importacao: options.defaultStatus
              })
              .eq('id', existingPosto.id);
            
            postoCache[posto.nome] = existingPosto.id;
            postosCreated++;
            results.push({ sucesso: true, tipo: 'posto', nome: posto.nome });
          } else {
            // Create new
            const code = `PDV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            const { data: newPdv, error } = await supabase
              .from('pdvs')
              .insert({
                name: posto.nome,
                code,
                address: posto.fonte_url || 'Endereço a confirmar',
                city: 'A confirmar',
                state: 'SP',
                type: 'posto',
                lat: posto.latitude,
                lng: posto.longitude,
                fonte_importacao: 'csv_json_massivo',
                id_importacao: `${posto.nome}-${posto.latitude}-${posto.longitude}`,
                status_importacao: options.defaultStatus,
                active_modules: ['media']
              })
              .select()
              .single();
            
            if (error) throw error;
            
            postoCache[posto.nome] = newPdv.id;
            postosCreated++;
            results.push({ sucesso: true, tipo: 'posto', nome: posto.nome });
          }
        } catch (error: any) {
          results.push({ 
            sucesso: false, 
            tipo: 'posto', 
            nome: posto.nome, 
            erro: error.message 
          });
        }
        
        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      // Now process outdoors
      for (const outdoor of outdoors) {
        try {
          // Find the referenced posto
          let postoId = postoCache[outdoor.posto_referencia || ''];
          
          if (!postoId && outdoor.posto_referencia) {
            // Try to find by partial match
            const { data } = await supabase
              .from('pdvs')
              .select('id')
              .ilike('name', `%${outdoor.posto_referencia}%`)
              .maybeSingle();
            
            if (data) {
              postoId = data.id;
              postoCache[outdoor.posto_referencia] = data.id;
            }
          }
          
          if (!postoId) {
            throw new Error(`Posto de referência não encontrado: ${outdoor.posto_referencia}`);
          }
          
          // Check for existing outdoor
          if (options.ignoreDuplicates) {
            const { data: existing } = await supabase
              .from('outdoors')
              .select('id')
              .eq('pdv_id', postoId)
              .ilike('location', `%${outdoor.nome}%`)
              .maybeSingle();
            
            if (existing) {
              results.push({ sucesso: true, tipo: 'outdoor', nome: outdoor.nome });
              processed++;
              setProgress(Math.round((processed / total) * 100));
              continue;
            }
          }
          
          const code = `OUT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          const { error } = await supabase
            .from('outdoors')
            .insert({
              code,
              location: outdoor.nome,
              pdv_id: postoId,
              lat: outdoor.latitude,
              lng: outdoor.longitude,
              width: 3,
              height: 2,
              status: 'pending_evaluation',
              fonte_importacao: 'csv_json_massivo',
              id_importacao: `${outdoor.nome}-${outdoor.latitude}-${outdoor.longitude}`,
              status_importacao: options.defaultStatus
            });
          
          if (error) throw error;
          
          outdoorsCreated++;
          results.push({ sucesso: true, tipo: 'outdoor', nome: outdoor.nome });
        } catch (error: any) {
          results.push({ 
            sucesso: false, 
            tipo: 'outdoor', 
            nome: outdoor.nome, 
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
    const csv = ['tipo,nome,erro'];
    errors.forEach(e => {
      csv.push(`${e.tipo},"${e.nome}","${e.erro || ''}"`);
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
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
    isProcessing,
    progress,
    summary,
    setSummary
  };
}
